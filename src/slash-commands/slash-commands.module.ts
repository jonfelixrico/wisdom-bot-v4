import { Module } from '@nestjs/common'
import { SubmitHandlerService } from './handlers/submit-handler/submit-handler.service'
import { ReceiveHandlerService } from './handlers/receive-handler/receive-handler.service'
import { DiscordModule } from 'src/discord/discord.module'
import { CommandRegistrationService } from './registration/command-registration/command-registration.service'
import { INTERACTION_EVENT_BUS_PROVIDER } from './providers/interaction-event-bus/interaction-event-bus.provider'

@Module({
  providers: [
    SubmitHandlerService,
    ReceiveHandlerService,
    CommandRegistrationService,
    INTERACTION_EVENT_BUS_PROVIDER,
  ],
  imports: [DiscordModule],
})
export class SlashCommandsModule {}
