import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { catchError, EMPTY, exhaustMap, filter, finalize, forkJoin, Subscription, switchMap, timer } from 'rxjs';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { Participant } from '@app/models/group-orders/participant.model';
import { GroupReservationStatus } from '@app/models/group-orders/group-status.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { consolidatePreOrder } from '@app/shared/helpers/consolidate-pre-order';
import { ParticipantCardComponent } from '@app/components/group-orders/participant-card/participant-card.component';
import { ModalComponent } from '@app/shared/custom-components/modal/modal.component';

@Component({
  selector: 'app-group-order-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ParticipantCardComponent, ModalComponent],
  templateUrl: './group-order-page.component.html',
  styleUrl: './group-order-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class GroupOrderPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly groupOrdersService = inject(GroupOrdersService);
  private readonly toastService = inject(ToastService);

  readonly reservationId = signal<string>('');
  readonly invite = signal<GuestInvite | null>(null);
  readonly participants = signal<Participant[]>([]);
  readonly ownerSessionId = signal<string>('');
  readonly groupStatus = signal<GroupReservationStatus>('Open');

  readonly isLoading = signal<boolean>(true);
  readonly error = signal<HttpErrorResponse | null>(null);

  readonly isSubmitting = signal<boolean>(false);
  readonly isSubmitModalOpen = signal<boolean>(false);

  readonly isRemoveModalOpen = signal<boolean>(false);
  readonly guestToRemove = signal<Participant | null>(null);

  readonly updatedAt = signal<Date | null>(null);
  readonly refreshError = signal<boolean>(false);

  private syncSubscription?: Subscription;
  private isRefreshing = false;

  readonly consolidatedOrder = computed(() => consolidatePreOrder(this.participants()));
  readonly grandTotal = computed(() => this.consolidatedOrder().total);
  readonly unsubmittedCount = computed(() => this.participants().filter((p) => !p.isSubmitted).length);
  readonly totalDishesCount = computed(() => this.participants().reduce((sum, p) => sum + p.items.length, 0));
  readonly isEmpty = computed(() => !this.isLoading() && !this.error() && this.totalDishesCount() === 0);
  readonly canSubmit = computed(
    () => this.consolidatedOrder().items.length > 0 && !this.isSubmitting() && this.groupStatus() === 'Open'
  );

  ngOnInit(): void {
    const resId = this.route.snapshot.paramMap.get('reservationId') ?? '';
    this.reservationId.set(resId);
    this.loadData();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadData(): void {
    this.stopPolling();
    this.isLoading.set(true);
    this.error.set(null);
    const resId = this.reservationId();

    this.groupOrdersService
      .getGroupInvite$(resId)
      .pipe(
        switchMap((invite) => {
          this.invite.set(invite);
          return forkJoin({
            sessions: this.groupOrdersService.getSessions$(invite.GroupReservationId),
            ownerSessionId: this.groupOrdersService.getOwnerSessionId$(resId),
            status: this.groupOrdersService.getStatus$(invite.GroupReservationId),
          });
        })
      )
      .subscribe({
        next: ({ sessions, ownerSessionId, status }) => {
          this.participants.set(sessions.participants);
          this.ownerSessionId.set(ownerSessionId);
          this.groupStatus.set(status.status);
          this.updatedAt.set(new Date());
          this.refreshError.set(false);
          this.isLoading.set(false);

          const invite = this.invite();
          if (invite && status.status === 'Open') {
            this.startPolling(invite.GroupReservationId);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(err);
          this.isLoading.set(false);
        },
      });
  }

  private startPolling(groupId: string): void {
    this.stopPolling();
    if (this.groupStatus() !== 'Open') {
      return;
    }

    this.syncSubscription = timer(15000, 15000)
      .pipe(
        filter(() => this.groupStatus() === 'Open' && !this.isRefreshing),
        exhaustMap(() => {
          this.isRefreshing = true;
          return forkJoin({
            sessions: this.groupOrdersService.getSessions$(groupId, { silent: true }),
            status: this.groupOrdersService.getStatus$(groupId, { silent: true }),
          }).pipe(
            finalize(() => {
              this.isRefreshing = false;
            }),
            catchError(() => {
              this.refreshError.set(true);
              return EMPTY;
            })
          );
        })
      )
      .subscribe({
        next: ({ sessions, status }) => {
          this.participants.set(sessions.participants);
          this.groupStatus.set(status.status);
          this.updatedAt.set(new Date());
          this.refreshError.set(false);
          if (status.status !== 'Open') {
            this.stopPolling();
          }
        },
      });
  }

  private stopPolling(): void {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
      this.syncSubscription = undefined;
    }
  }

  refreshManually(): void {
    const invite = this.invite();
    if (!invite || this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;
    forkJoin({
      sessions: this.groupOrdersService.getSessions$(invite.GroupReservationId),
      status: this.groupOrdersService.getStatus$(invite.GroupReservationId),
    })
      .pipe(
        finalize(() => {
          this.isRefreshing = false;
        })
      )
      .subscribe({
        next: ({ sessions, status }) => {
          this.participants.set(sessions.participants);
          this.groupStatus.set(status.status);
          this.updatedAt.set(new Date());
          this.refreshError.set(false);
          if (status.status !== 'Open') {
            this.stopPolling();
          }
        },
        error: () => {
          this.refreshError.set(true);
        },
      });
  }

  openSubmitModal(): void {
    if (this.canSubmit()) {
      this.isSubmitModalOpen.set(true);
    }
  }

  closeSubmitModal(): void {
    if (!this.isSubmitting()) {
      this.isSubmitModalOpen.set(false);
    }
  }

  confirmSubmit(): void {
    if (this.isSubmitting() || !this.canSubmit()) {
      return;
    }

    const invite = this.invite();
    if (!invite) {
      return;
    }

    this.isSubmitting.set(true);
    this.groupOrdersService.submit$(invite.GroupReservationId, this.reservationId()).subscribe({
      next: () => {
        this.toastService.success('Pre-order sent to the restaurant');
        this.groupStatus.set('Submitted');
        this.isSubmitting.set(false);
        this.isSubmitModalOpen.set(false);
        this.stopPolling();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.isSubmitModalOpen.set(false);
      },
    });
  }

  openRemoveGuestModal(participant: Participant): void {
    this.guestToRemove.set(participant);
    this.isRemoveModalOpen.set(true);
  }

  cancelRemoveGuest(): void {
    this.isRemoveModalOpen.set(false);
    this.guestToRemove.set(null);
  }

  confirmRemoveGuest(): void {
    const guest = this.guestToRemove();
    const invite = this.invite();
    if (!guest || !invite) {
      return;
    }

    this.groupOrdersService.removeSession$(invite.GroupReservationId, guest.id).subscribe({
      next: (res) => {
        this.participants.set(res.participants);
        this.isRemoveModalOpen.set(false);
        this.guestToRemove.set(null);
      },
      error: () => {
        this.isRemoveModalOpen.set(false);
        this.guestToRemove.set(null);
      },
    });
  }
}
