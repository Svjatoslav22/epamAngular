import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { GROUP_ORDER_PREVIEW } from '@app/shared/mocks/group-orders/group-order.preview';
import { ParticipantCardComponent } from '@app/components/group-orders/participant-card/participant-card.component';

@Component({
  selector: 'app-group-order-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ParticipantCardComponent],
  templateUrl: './group-order-page.component.html',
  styleUrl: './group-order-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class GroupOrderPageComponent {
  readonly preview = signal(GROUP_ORDER_PREVIEW);
  readonly invite = signal(GROUP_ORDER_PREVIEW.invite);
  readonly participants = signal(GROUP_ORDER_PREVIEW.sessions.participants);
  readonly grandTotal = signal(GROUP_ORDER_PREVIEW.sessions.total);
}
