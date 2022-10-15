import { Module } from '@nestjs/common'
import { ApiModule } from 'src/api/api.module'
import { DiscordModule } from 'src/discord/discord.module'
import { UpvoteHandlerService } from './handlers/upvote-handler/upvote-handler.service'

@Module({
  providers: [UpvoteHandlerService],
  imports: [DiscordModule, ApiModule],
})
export class ButtonInteractionsModule {}
