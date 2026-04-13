import { client } from './client';
import { parseTicketQrPayload } from '../lib/ticketQr';
import type { ClientTicketDto } from '../types/client';

export const ticketValidationApi = {
  async validateQrPayload(qrPayload: string) {
    const parsed = parseTicketQrPayload(qrPayload);
    if (!parsed) {
      throw new Error('QR de billet invalide');
    }

    return client.post<{ data: ClientTicketDto }>('/tickets/validate', {
      ticketId: parsed.ticketId,
      qrCode: parsed.token,
      payloadVersion: parsed.v,
    });
  },
};
