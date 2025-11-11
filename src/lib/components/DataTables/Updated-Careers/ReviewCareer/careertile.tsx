import React, { useState } from "react";
import "@/lib/styles/careertile.scss";

export type Member = {
  id: string;
  name: string;
  email: string;
  role?: "owner" | "contributor" | "reviewer";
  you?: boolean;
};

export default function CareerTile({
  data = {
    jobTitle: "Software Engineer - Java",
    employmentType: "Full-time",
    arrangement: "Hybrid",
    country: "Philippines",
    state: "Metro Manila",
    city: "Pasig City",
    minSalary: "Negotiable",
    maxSalary: "Negotiable",
    jobDescription:
      "We are seeking a talented and driven Software Engineer with strong expertise in Java and Spring Boot to help build scalable, high-performance backend systems. This role involves designing and developing RESTful APIs and microservices that power our core business applications. You'll collaborate closely with cross-functional teams to deliver secure, reliable, and well-documented backend solutions.",
    responsibilities: [
      "API-First Development: Design and develop services using an API-first approach, ensuring clear contracts and collaboration between frontend, backend, and integration teams.",
      "Backend Engineering: Build and maintain RESTful APIs and backend services using Java, Quarkus and Spring Boot with scalability, performance, and maintainability in mind.",
      "Microservices Architecture: Implement microservices that are modular, maintainable, and optimized for scalability.",
      "Security Compliance: Implement robust API security using authentication and authorization standards (e.g., OAuth2, JWT).",
      "Performance Optimization: Monitor and tune backend services for performance.",
    ],
    qualifications: [
      "Solid experience in Java and Spring Boot development.",
      "Proficient in API-first design and RESTful API development with tools like OpenAPI/Swagger.",
      "Strong understanding of API security protocols (OAuth2, JWT, TLS).",
      "Experience with CI/CD pipelines and containerization.",
    ],
    niceToHave: [
      "Experience with event-driven architectures (Kafka, RabbitMQ).",
      "Exposure to GraphQL, gRPC, or advanced API technologies.",
    ],
  },
  members = [
    { id: "1", name: "Sabine Beatrix Dy", email: "sabine@whitecloak.com", role: "owner", you: true },
    { id: "2", name: "Darlene Santo Tomas", email: "darlene@whitecloak.com", role: "contributor" },
  ] as Member[],
}: {
  data?: any;
  members?: Member[];
}) {
  const [open, setOpen] = useState(true);

  // helper to render initials
  const initials = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="career-tile-outer">
      <div className={`career-tile ${open ? "open" : ""}`}>

        {/* Header */}
        <div className="header-row">
          <button
            className="header-btn"
            aria-expanded={open}
            onClick={() => setOpen((s) => !s)}
            title={open ? "Collapse" : "Expand"}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div className="job-icon">J</div>

              <div style={{ minWidth: 0 }}>
                <h3>{data.jobTitle}</h3>
                <div className="subtitle">Career Details & Team Access</div>
              </div>
            </div>

            <div className="right-controls" aria-hidden>
              {/* small pill */}
              <div className="pill">Review</div>

              {/* simple chevron toggle */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{opacity:0.7}}>
                <path d="M6 9l6 6 6-6" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>

          {/* edit icon top-right */}
          <button className="edit-btn" aria-label="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 21v-3.75l11.06-11.06 3.75 3.75L6.75 21H3z" stroke="#334155" strokeWidth="0.6" fill="none"/>
              <path d="M14.06 6.94l3 3" stroke="#334155" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Fields grid (collapsed always visible summary) */}
        <div className="fields">
          <div>
            <div className="field-label">Job Title</div>
            <div className="field-value">{data.jobTitle}</div>
          </div>

          <div>
            <div className="field-label">Employment Type</div>
            <div className="field-value">{data.employmentType}</div>
          </div>

          <div>
            <div className="field-label">Work Arrangement</div>
            <div className="field-value">{data.arrangement}</div>
          </div>

          <div>
            <div className="field-label">Country</div>
            <div className="field-value">{data.country}</div>
          </div>

          <div>
            <div className="field-label">State / Province</div>
            <div className="field-value">{data.state}</div>
          </div>

          <div>
            <div className="field-label">City</div>
            <div className="field-value">{data.city}</div>
          </div>

          <div>
            <div className="field-label">Minimum Salary</div>
            <div className="field-value">{data.minSalary}</div>
          </div>

          <div>
            <div className="field-label">Maximum Salary</div>
            <div className="field-value">{data.maxSalary}</div>
          </div>
        </div>

        {/* When collapsed (if you prefer), you can hide expanded area by conditionally rendering.
            Here we show expanded area when open === true to match your reference image. */}
        {open && (
          <div className="expanded-area">
            <div>
              <h4 className="section-title">Job Description</h4>
              <p>{data.jobDescription}</p>
            </div>

            <div>
              <h4 className="section-title" style={{ marginTop: 14 }}>Responsibilities:</h4>
              <ul>
                {(data.responsibilities || []).map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="section-title" style={{ marginTop: 14 }}>Qualifications:</h4>
              <ul>
                {(data.qualifications || []).map((q: string, i: number) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>

            {data.niceToHave && data.niceToHave.length > 0 && (
              <div>
                <h4 className="section-title" style={{ marginTop: 14 }}>Nice to have:</h4>
                <ul>
                  {data.niceToHave.map((n: string, i: number) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Team Access */}
            <div className="team-access">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="avatar-stack">
                  {members.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="avatar">{initials(m.name)}</div>
                      <div className="member-details">
                        <div className="member-name">{m.name}{m.you ? " (You)" : ""}</div>
                        <div className="member-email">{m.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="member-role">
                {members.length > 0 ? (members[0].role === "owner" ? "Job Owner" : "Contributor") : ""}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
