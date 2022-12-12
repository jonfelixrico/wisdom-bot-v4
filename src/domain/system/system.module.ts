import { Module } from '@nestjs/common'
import { ApiModule } from 'src/api/api.module'
import { DiscordModule } from 'src/discord/discord.module'
import { AboutHandlerService } from './slash-interactions/about-handler/about-handler.service'

@Module({
  imports: [ApiModule, DiscordModule],
  providers: [AboutHandlerService],
})
export class SystemModule {}
