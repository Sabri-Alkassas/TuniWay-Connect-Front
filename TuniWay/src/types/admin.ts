export type StaffRole   = 'EMPLOYEE' | 'ADMIN';
export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ShiftStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type TransportType = 'BUS' | 'METRO' | 'TRAM';


export interface AdminDashboardResponse {
  totalStaff:        number;
  activeStaff:       number;
  employeeCount:     number;
  adminCount:        number;
  totalTransports:   number;
  activeTransports:  number;
  shiftsPending:     number;
  shiftsActive:      number;
  shiftsCompleted:   number;
}


export interface StaffAccountResponse {
  id:             string;
  firstName:      string;
  lastName:       string;
  email:          string;
  role:           StaffRole;
  status:         StaffStatus;
  licenseNumber?: string;
  employeeCode?:  string;
  adminCode?:     string;
  createdAt:      string;
}

export interface RegisterStaffBody {
  firstName:      string;
  lastName:       string;
  email:          string;
  password:       string;
  role:           StaffRole;
  licenseNumber?: string;
  employeeCode?:  string;
  adminCode?:     string;
}

export interface UpdateStaffBody {
  firstName?:     string;
  lastName?:      string;
  email?:         string;
  role?:          StaffRole;
  licenseNumber?: string;
  employeeCode?:  string;
  adminCode?:     string;
}

export interface UpdateStaffStatusBody {
  status: StaffStatus;
}


export interface TransportResponse {
  id:               string;
  name:             string;
  type:             TransportType;
  zone:             string;
  active:           boolean;
  stopsCount:       number;
  departuresCount:  number;
}

export interface CreateTransportBody {
  name:   string;
  type:   TransportType;
  zone:   string;
  active: boolean;
}

export interface UpdateTransportBody {
  name?:   string;
  type?:   TransportType;
  zone?:   string;
  active?: boolean;
}

export interface TransportStopItem {
  id?:        string;
  stopOrder:  number;
  name:       string;
  zone:       string;
  active:     boolean;
  lat?:       number;
  lng?:       number;
}

export interface UpdateTransportStopsBody {
  stops: TransportStopItem[];
}

export interface TransportDepartureItem {
  id?:        string;
  stopId:     string;
  dayOfWeek:  string;
  time:       string;   
  active:     boolean;
  stopOrder:  number;
}

export interface UpdateTransportDeparturesBody {
  departures: TransportDepartureItem[];
}

export interface UpdateTransportZoneBody {
  zone: string;
}


export interface AdminShiftResponse {
  id:            string;
  employeeId:    string;
  employeeName:  string;
  transportId:   string;
  transportName: string;
  startTime:     string;  
  endTime:       string;
  status:        ShiftStatus;
}

export interface UpdateShiftBody {
  startTime?:   string;
  endTime?:     string;
  transportId?: string;
}

export interface ReassignTransportBody {
  transportId: string;
}


export interface PublishPlanningBody {
  shiftIds: string[];
}
