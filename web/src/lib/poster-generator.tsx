// Poster generation using satori (HTML/CSS → SVG) + sharp (SVG → PNG)
// All posters are 1080x1080px (square, optimal for Instagram/Facebook)

import satori from "satori";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import React from "react";
import type { Fixture } from "@/lib/sports-db";

const POSTER_DIR = path.join(process.cwd(), "data", "posters");

function ensurePosterDir() {
  if (!fs.existsSync(POSTER_DIR)) {
    fs.mkdirSync(POSTER_DIR, { recursive: true });
  }
}

// Load Inter font weights for satori
let fontCache: { regular: ArrayBuffer; bold: ArrayBuffer; black: ArrayBuffer } | null = null;

function getFonts() {
  if (fontCache) return fontCache;
  const base = path.join(
    process.cwd(),
    "node_modules/@fontsource/inter/files"
  );
  fontCache = {
    regular: fs.readFileSync(path.join(base, "inter-latin-400-normal.woff2")).buffer as ArrayBuffer,
    bold: fs.readFileSync(path.join(base, "inter-latin-700-normal.woff2")).buffer as ArrayBuffer,
    black: fs.readFileSync(path.join(base, "inter-latin-900-normal.woff2")).buffer as ArrayBuffer,
  };
  return fontCache;
}

function satoriOptions(width = 1080, height = 1080) {
  const fonts = getFonts();
  return {
    width,
    height,
    fonts: [
      { name: "Inter", data: fonts.regular, weight: 400 as const, style: "normal" as const },
      { name: "Inter", data: fonts.bold, weight: 700 as const, style: "normal" as const },
      { name: "Inter", data: fonts.black, weight: 900 as const, style: "normal" as const },
    ],
  };
}

async function renderToPng(element: React.ReactElement, width?: number, height?: number): Promise<Buffer> {
  const svg = await satori(element, satoriOptions(width, height));
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ── Game Day Poster ───────────────────────────────────────────────────────────

function formatMatchTime(matchDate: string): string {
  const d = new Date(matchDate);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

function formatMatchDate(matchDate: string): string {
  const d = new Date(matchDate);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(matchDate: string): string {
  const d = new Date(matchDate);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function GameDayPoster({ fixture }: { fixture: Fixture }) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        fontFamily: "Inter",
        color: "white",
        padding: "60px",
      }}
    >
      {/* Top bar: competition */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: "40px",
            padding: "10px 32px",
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#e0d7ff",
          }}
        >
          {fixture.competition_name ?? "Match Day"}
        </div>
      </div>

      {/* Main VS section */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        {/* Home team */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            gap: "24px",
          }}
        >
          {fixture.home_team_crest ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fixture.home_team_crest}
              width={200}
              height={200}
              alt=""
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "64px",
                fontWeight: 900,
              }}
            >
              {(fixture.home_team_name ?? "?").slice(0, 1)}
            </div>
          )}
          <div
            style={{
              fontSize: "36px",
              fontWeight: 900,
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: "280px",
            }}
          >
            {fixture.home_team_name}
          </div>
        </div>

        {/* VS badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              fontSize: "80px",
              fontWeight: 900,
              color: "#a78bfa",
              letterSpacing: "-4px",
            }}
          >
            VS
          </div>
          <div
            style={{
              width: "2px",
              height: "120px",
              background: "rgba(167,139,250,0.4)",
            }}
          />
        </div>

        {/* Away team */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            gap: "24px",
          }}
        >
          {fixture.away_team_crest ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fixture.away_team_crest}
              width={200}
              height={200}
              alt=""
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "64px",
                fontWeight: 900,
              }}
            >
              {(fixture.away_team_name ?? "?").slice(0, 1)}
            </div>
          )}
          <div
            style={{
              fontSize: "36px",
              fontWeight: 900,
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: "280px",
            }}
          >
            {fixture.away_team_name}
          </div>
        </div>
      </div>

      {/* Bottom: date, time, venue */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          marginTop: "40px",
          paddingTop: "32px",
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div style={{ fontSize: "32px", fontWeight: 700, color: "#e0d7ff" }}>
          {formatMatchDate(fixture.match_date)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
          }}
        >
          <div
            style={{
              background: "#a78bfa",
              borderRadius: "12px",
              padding: "10px 28px",
              fontSize: "36px",
              fontWeight: 900,
              color: "white",
            }}
          >
            {formatMatchTime(fixture.match_date)}
          </div>
          {fixture.venue && (
            <div style={{ fontSize: "24px", color: "rgba(255,255,255,0.6)" }}>
              {fixture.venue}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Result Poster ─────────────────────────────────────────────────────────────

function ResultPoster({ fixture }: { fixture: Fixture }) {
  const homeScore = fixture.home_score ?? 0;
  const awayScore = fixture.away_score ?? 0;

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0d1117 100%)",
        fontFamily: "Inter",
        color: "white",
        padding: "60px",
      }}
    >
      {/* Top: FULL TIME badge + competition */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            background: "#22c55e",
            borderRadius: "8px",
            padding: "8px 24px",
            fontSize: "22px",
            fontWeight: 900,
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}
        >
          Full Time
        </div>
        <div style={{ fontSize: "24px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
          {fixture.competition_name}
        </div>
      </div>

      {/* Score row */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Home */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            gap: "20px",
          }}
        >
          {fixture.home_team_crest ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fixture.home_team_crest}
              width={180}
              height={180}
              alt=""
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "60px",
                fontWeight: 900,
              }}
            >
              {(fixture.home_team_name ?? "?").slice(0, 1)}
            </div>
          )}
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              textAlign: "center",
              maxWidth: "260px",
            }}
          >
            {fixture.home_team_name}
          </div>
        </div>

        {/* Score */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            padding: "0 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0px",
            }}
          >
            <div
              style={{
                fontSize: "160px",
                fontWeight: 900,
                lineHeight: 1,
                color: homeScore > awayScore ? "#22c55e" : homeScore === awayScore ? "#f59e0b" : "white",
                minWidth: "140px",
                textAlign: "center",
              }}
            >
              {homeScore}
            </div>
            <div style={{ fontSize: "80px", fontWeight: 700, color: "rgba(255,255,255,0.3)", margin: "0 8px" }}>
              -
            </div>
            <div
              style={{
                fontSize: "160px",
                fontWeight: 900,
                lineHeight: 1,
                color: awayScore > homeScore ? "#22c55e" : homeScore === awayScore ? "#f59e0b" : "white",
                minWidth: "140px",
                textAlign: "center",
              }}
            >
              {awayScore}
            </div>
          </div>
        </div>

        {/* Away */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            gap: "20px",
          }}
        >
          {fixture.away_team_crest ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fixture.away_team_crest}
              width={180}
              height={180}
              alt=""
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "60px",
                fontWeight: 900,
              }}
            >
              {(fixture.away_team_name ?? "?").slice(0, 1)}
            </div>
          )}
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              textAlign: "center",
              maxWidth: "260px",
            }}
          >
            {fixture.away_team_name}
          </div>
        </div>
      </div>

      {/* Bottom: date */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: "32px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          fontSize: "26px",
          color: "rgba(255,255,255,0.5)",
          fontWeight: 600,
        }}
      >
        {formatMatchDate(fixture.match_date)}
      </div>
    </div>
  );
}

// ── Weekly Schedule Poster ────────────────────────────────────────────────────

interface DayGroup {
  label: string;
  fixtures: Fixture[];
}

function groupByDay(fixtures: Fixture[]): DayGroup[] {
  const map = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const day = f.match_date.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(f);
  }
  return Array.from(map.entries()).map(([day, list]) => ({
    label: formatShortDate(day + "T12:00:00Z"),
    fixtures: list,
  }));
}

function WeeklySchedulePoster({
  fixtures,
  weekStart,
}: {
  fixtures: Fixture[];
  weekStart: string;
}) {
  const groups = groupByDay(fixtures).slice(0, 5); // max 5 days to fit
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${formatShortDate(weekStart + "T12:00:00Z")} – ${formatShortDate(weekEnd.toISOString())}`;

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
        fontFamily: "Inter",
        color: "white",
        padding: "56px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: "40px",
          gap: "10px",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            fontWeight: 900,
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          This Week&apos;s Fixtures
        </div>
        <div
          style={{
            fontSize: "22px",
            color: "#818cf8",
            fontWeight: 600,
            letterSpacing: "1px",
          }}
        >
          {weekLabel}
        </div>
        <div
          style={{
            width: "80px",
            height: "3px",
            background: "#818cf8",
            borderRadius: "2px",
            marginTop: "8px",
          }}
        />
      </div>

      {/* Fixture groups */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "24px" }}>
        {groups.length === 0 ? (
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            No fixtures this week
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Day header */}
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#818cf8",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  paddingBottom: "6px",
                  borderBottom: "1px solid rgba(129,140,248,0.3)",
                }}
              >
                {group.label}
              </div>
              {/* Fixture rows */}
              {group.fixtures.slice(0, 4).map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "12px",
                    padding: "14px 20px",
                    gap: "16px",
                  }}
                >
                  {/* Time */}
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#818cf8",
                      minWidth: "56px",
                    }}
                  >
                    {formatMatchTime(f.match_date)}
                  </div>
                  {/* Home team */}
                  <div
                    style={{
                      flex: 1,
                      fontSize: "22px",
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  >
                    {f.home_team_name}
                  </div>
                  {/* VS */}
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.3)",
                      padding: "0 8px",
                    }}
                  >
                    vs
                  </div>
                  {/* Away team */}
                  <div
                    style={{
                      flex: 1,
                      fontSize: "22px",
                      fontWeight: 700,
                    }}
                  >
                    {f.away_team_name}
                  </div>
                  {/* Competition */}
                  <div
                    style={{
                      fontSize: "16px",
                      color: "rgba(255,255,255,0.35)",
                      minWidth: "80px",
                      textAlign: "right",
                    }}
                  >
                    {f.competition_name?.replace(" League", "").replace("Premier", "PL").slice(0, 10)}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateGameDayPoster(
  posterId: string,
  fixture: Fixture
): Promise<string> {
  ensurePosterDir();
  const png = await renderToPng(<GameDayPoster fixture={fixture} />);
  const filePath = path.join(POSTER_DIR, `${posterId}.png`);
  fs.writeFileSync(filePath, png);
  return filePath;
}

export async function generateResultPoster(
  posterId: string,
  fixture: Fixture
): Promise<string> {
  ensurePosterDir();
  const png = await renderToPng(<ResultPoster fixture={fixture} />);
  const filePath = path.join(POSTER_DIR, `${posterId}.png`);
  fs.writeFileSync(filePath, png);
  return filePath;
}

export async function generateWeeklySchedulePoster(
  posterId: string,
  fixtures: Fixture[],
  weekStart: string
): Promise<string> {
  ensurePosterDir();
  const png = await renderToPng(
    <WeeklySchedulePoster fixtures={fixtures} weekStart={weekStart} />
  );
  const filePath = path.join(POSTER_DIR, `${posterId}.png`);
  fs.writeFileSync(filePath, png);
  return filePath;
}
