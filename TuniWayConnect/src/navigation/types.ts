export type RootTabParamList = {
  Home: undefined;
  Map: undefined;
  Tickets: undefined;
  Profile: undefined;
};

export type BuyStackParamList = {
  BuyTicket: { stationId: string; stationName: string };
  Confirm: { ticketId: string };
};