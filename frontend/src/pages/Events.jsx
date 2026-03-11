import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { authFetch, getAuthUser } from "../utils/auth";

export default function Events() {
  const user = getAuthUser();
  const [events, setEvents] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [country, setCountry] = useState("India");
  const [domain, setDomain] = useState("all");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      try {
        const baseQuery = new URLSearchParams();
        if (country && country !== "all") baseQuery.set("country", country);
        if (domain && domain !== "all") baseQuery.set("domain", domain);
        baseQuery.set("days", "180");
        const upcomingPath = `/api/events/upcoming?${baseQuery.toString()}`;

        const calls = [
          authFetch(upcomingPath, { signal: controller.signal }),
        ];

        if (user?.id) {
          calls.push(authFetch(`/api/events/recommended/${user.id}?limit=8`, { signal: controller.signal }));
        }

        const responses = await Promise.all(calls);
        const upcomingRes = responses[0];
        if (!upcomingRes.ok) throw new Error("Failed to load events");
        const upcomingData = await upcomingRes.json();
        setEvents(upcomingData || []);

        if (responses[1]?.ok) {
          const recData = await responses[1].json();
          setRecommended(recData.events || []);
          setPreferences(recData.preferences || null);
        } else {
          setRecommended([]);
          setPreferences(null);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load events");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [user?.id, country, domain]);

  const countries = ["all", "India", "United States", "United Kingdom", "Qatar"];
  const domains = ["all", "sports", "education", "art"];

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Events Discovery</h1>
          <p className="text-sm text-gray-600">Find upcoming opportunities in India and globally.</p>
        </div>
        <div className="flex gap-2">
          <select
            className="rounded border bg-white px-3 py-2 text-sm"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            {domains.map((d) => <option key={d} value={d}>{d === "all" ? "All Domains" : d}</option>)}
          </select>
          <select
            className="rounded border bg-white px-3 py-2 text-sm"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {countries.map((c) => <option key={c} value={c}>{c === "all" ? "All Countries" : c}</option>)}
          </select>
        </div>
      </div>

      {error ? <p className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</p> : null}
      {loading ? <p>Loading events...</p> : null}

      {!loading && recommended.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-2 text-xl font-semibold">Recommended For You</h2>
          {preferences ? (
            <p className="mb-3 text-xs text-gray-500">
              Based on your roadmap: {preferences.domain}/{preferences.subdomain} | Location: {preferences.country}
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recommended.map((event) => <EventCard key={`rec-${event.id}`} event={event} highlight />)}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Upcoming Events</h2>
        {!loading && events.length === 0 ? <p className="text-gray-500">No events found for current filters.</p> : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      </section>
    </Layout>
  );
}

function EventCard({ event, highlight = false }) {
  const startDate = event.start_date || event.event_date;
  const regDeadline = event.registration_deadline || event.deadline;
  const startDateObj = new Date(startDate);
  const regDeadlineObj = new Date(regDeadline);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((regDeadlineObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <article className={`rounded border bg-white p-4 shadow ${highlight ? "border-blue-500 ring-1 ring-blue-200" : "border-gray-200"}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{event.title}</h3>
        <span className="rounded bg-gray-100 px-2 py-1 text-xs uppercase">{event.domain}</span>
      </div>
      <p className="mb-1 text-sm text-gray-600">{event.subdomain} • {event.event_type}</p>
      <p className="mb-1 text-sm text-gray-700">{event.location}, {event.country}</p>
      <p className="text-sm text-gray-700">Start: {toDateLabel(startDateObj)}</p>
      <p className="text-sm text-gray-700">Registration deadline: {toDateLabel(regDeadlineObj)}</p>
      <p className={`mt-2 text-sm font-medium ${daysLeft <= 7 ? "text-red-600" : "text-blue-700"}`}>
        Countdown: {daysLeft} day(s) left to register
      </p>
      <p className="mt-2 text-sm text-gray-600">{event.description || "No description provided."}</p>

      {event.registration_url ? (
        <a
          href={event.registration_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        >
          Register
        </a>
      ) : (
        <button type="button" disabled className="mt-3 rounded bg-gray-300 px-3 py-2 text-sm text-gray-700">
          Register
        </button>
      )}
    </article>
  );
}

function toDateLabel(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "N/A";
  return date.toISOString().slice(0, 10);
}
