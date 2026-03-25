export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type UserTabParamList = {
  Home: undefined;
  Map: undefined;
  Tickets: undefined;
  Profile: undefined;
};

export type BuyStackParamList = {
  BuyTicket: { stationId: string; stationName: string };
  Confirm: { ticketId: string };
};

export type DriverTabParamList = {
  DriverHome: undefined;
  Scan: undefined;
  DriverProfile: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Users: undefined;
  Stations: undefined;
  AdminScan: undefined;
};
