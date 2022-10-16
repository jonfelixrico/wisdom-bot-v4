import { Injectable, Logger } from '@nestjs/common'
import { concatMap, debounceTime, from, groupBy, mergeMap, Subject } from 'rxjs'
import { GetPendingQuoteRespDto } from 'src/api/pending-quote-api/dto/get-pending-quote-dto.interface'
import { PendingQuoteApiService } from 'src/api/pending-quote-api/pending-quote-api.service'
import { MessageService } from 'src/discord/services/message/message.service'
import { PendingQuoteMessageGeneratorService } from '../pending-quote-message-generator/pending-quote-message-generator.service'

@Injectable()
export class PendingQuoteDownstreamService {
  private readonly LOGGER = new Logger(PendingQuoteDownstreamService.name)

  private subject = new Subject<string>()

  constructor(
    private api: PendingQuoteApiService,
    private msgGen: PendingQuoteMessageGeneratorService,
    private msgSvc: MessageService,
  ) {
    this.initListener()
  }

  private async reRenderOngoing(dto: GetPendingQuoteRespDto) {
    const { LOGGER } = this

    const { id } = dto

    LOGGER.debug(`Updating message for ongoing quote ${id}`)
    try {
      const message = await this.msgSvc.getMessage(dto)
      if (!message) {
        return
      }

      await message.edit(
        await this.msgGen.generateForOngoing({
          ...dto,
          year: new Date(dto.submitDt).getFullYear(),
        }),
      )

      LOGGER.debug(`Re-rendered the message for quote ${id}`)
    } catch (e) {
      LOGGER.error(
        `Error encountered while re-rendering the message of quote ${id}`,
        e,
      )
    }
  }

  private async processApproval(dto: GetPendingQuoteRespDto) {
    const { LOGGER } = this
    const { id } = dto

    LOGGER.debug(`Handling the approval of quote ${id}`)

    try {
      const message = await this.msgSvc.getMessage(dto)

      await this.api.finalizeStatus({
        quoteId: id,
        status: 'APPROVED',
      })
      LOGGER.debug(`Finalized status of quote ${id} as approved`)

      await message.edit(
        await this.msgGen.generateForApproval({
          ...dto,
          year: new Date(dto.submitDt).getFullYear(),
        }),
      )

      await message.channel.send({
        reply: {
          messageReference: message,
        },
        content: 'This quote has been approved 🎊🎉',
      })
    } catch (e) {
      LOGGER.error(
        `Error encountered while processing the approval of quote ${id}`,
        e,
      )
    }
  }

  private async handle(quoteId: string) {
    const quoteData = await this.api.get({ quoteId })
    if (!quoteData) {
      this.LOGGER.warn(`Did not find pending quote ${quoteId}`)
      return
    }

    if (new Date() > new Date(quoteData.expirationDt)) {
      // TODO implement expiration
      // do expiration processing
      // render
    } else if (
      // check if quote has reached enough numbers of upvotes
      Object.values(quoteData.votes ?? {}).length >= quoteData.requiredVoteCount
    ) {
      await this.processApproval(quoteData)
    } else {
      await this.reRenderOngoing(quoteData)
    }
  }

  private async handleWrapped(quoteId: string) {
    this.LOGGER.debug(`Handling ${quoteId}`)
    try {
      await this.handle(quoteId)
    } catch (e) {
      this.LOGGER.error(`Uncaught exception while processing ${quoteId}`, e)
    }
  }

  queueForProcessing(quoteId: string) {
    this.subject.next(quoteId)
    this.LOGGER.debug(`Queued quote ${quoteId}`)
  }

  private initListener() {
    this.subject
      .pipe(
        groupBy((id) => id),
        mergeMap((idGroup$) => {
          return idGroup$.pipe(
            // debounceTime + groupBy will debounce calls per quote id
            debounceTime(2500),
            // this is to handle debounce emits sequentially
            concatMap((id) => from(this.handleWrapped(id))),
          )
        }),
      )
      .subscribe() // need to subscribe or else the handler will not be called
  }
}
