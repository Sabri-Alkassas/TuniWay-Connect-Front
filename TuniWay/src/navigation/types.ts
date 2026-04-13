import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string };
  TwoFactor: { tempToken: string };
  Tabs: undefined;
};

export type UserTabParamList = {
  Home: undefined;
  Search: undefined;
  Map: undefined;
  Tickets: undefined;
  Profile: undefined;
};

export type UserStackParamList = {
  UserTabs: NavigatorScreenParams<UserTabParamList> | undefined;
  BuyTicket: { transportId: string; transportName: string };
  TicketConfirm: { ticketId: string };
  TransportDetail: { transportId: string };
  EditProfile: undefined;
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

export type AdminTabParamLista = {
  AdminDashboard:  undefined;
  AdminStaff:      undefined;
  AdminTransports: undefined;
  AdminPlanning:   undefined;
  AdminProfile:    undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
};
