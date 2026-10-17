import { Clock3, Plane } from "lucide-react";
import type { Airport } from "@/data/airports";
import { Icon } from "./ui";

interface RouteSchedule {
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate: string;
  arrivalNote?: string;
  duration: string;
  stops: string;
}

/** Presentation only: callers retain all airport, local-time and calendar formatting rules. */
export function AirportRoute({ origin, destination, schedule }: {
  origin: Pick<Airport, "code" | "city">;
  destination: Pick<Airport, "code" | "city">;
  schedule?: RouteSchedule;
}) {
  function endpoint(airport: Pick<Airport, "code" | "city">, departure: boolean) {
    const side = departure ? "departure" : "arrival";
    return <div className={`airport-time ${schedule ? `ticket-${side}` : `route-summary-${side}`}`}>
      {schedule && <strong>{departure ? schedule.departureTime : schedule.arrivalTime}</strong>}
      <bdi className={schedule ? "ticket-airport-code" : "route-airport-code"} lang="en">{airport.code}</bdi>
      <span className={schedule ? "ticket-airport-name" : "route-airport-name"}>{airport.city}</span>
      {schedule && <span className="ticket-date">{departure ? schedule.departureDate : schedule.arrivalDate}</span>}
      {!departure && schedule?.arrivalNote && <span className="ticket-day-offset">{schedule.arrivalNote}</span>}
    </div>;
  }

  return <div className={`airport-route ${schedule ? `flight-route ticket-route${schedule.arrivalNote ? " has-day-offset" : ""}` : "route-summary"}`} role="group" aria-label="مسیر پرواز">
    {endpoint(origin, true)}
    <div className={`route-middle${schedule ? " ticket-route-middle" : ""}`}>
      {schedule && <span className="ticket-duration"><Icon icon={Clock3} size={14} />{schedule.duration}</span>}
      <div className={`route-track${schedule ? " ticket-route-track" : ""}`} aria-hidden="true"><span /><Icon icon={Plane} size={20} className={`route-plane${schedule ? " ticket-route-plane" : ""}`} /><span /></div>
      {schedule && <span className="ticket-stop-label">{schedule.stops}</span>}
    </div>
    {endpoint(destination, false)}
  </div>;
}
