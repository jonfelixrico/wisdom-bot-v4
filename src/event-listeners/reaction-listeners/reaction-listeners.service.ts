import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { Client, PartialMessageReaction } from 'discord.js'
import { debounceTime, groupBy, mergeMap, Observable, Subject } from 'rxjs'

function debounceEmitsByMessageId(
  subject: Subject<PartialMessageReaction>,
): Observable<PartialMessageReaction> {
  subject.pipe(
    groupBy((reaction) => reaction.message.id),
    mergeMap((grouped) => {
      return grouped.pipe(debounceTime(2))
    }),
  )
  return null
}

@Injectable()
export class ReactionListenersService implements OnApplicationBootstrap {
  private subject: Subject<PartialMessageReaction>
  private observable: Observable<PartialMessageReaction>

  constructor(private client: Client) {
    this.subject = new Subject()
    this.observable = debounceEmitsByMessageId(this.subject)
  }

  get reactionDeltas$() {
    return this.observable
  }

  private handleReactionChanges(reaction: PartialMessageReaction) {
    this.subject.next(reaction)
  }

  onApplicationBootstrap() {
    const handleReactionChanges = this.handleReactionChanges.bind(this)

    this.client.on('messageReactionAdd', handleReactionChanges)

    this.client.on('messageReactionRemove', handleReactionChanges)

    this.client.on('messageReactionRemoveAll', (message, reactions) => {
      reactions.forEach(handleReactionChanges)
    })

    this.client.on('messageReactionRemoveEmoji', handleReactionChanges)
  }
}
