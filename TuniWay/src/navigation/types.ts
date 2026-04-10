export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string };
  TwoFactor: { tempToken: string };
  Tabs: undefined;
};

export type UserTabParamList = {
  Home: undefined;
  Map: undefined;
  Tickets: undefined;
  Profile: undefined;
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
