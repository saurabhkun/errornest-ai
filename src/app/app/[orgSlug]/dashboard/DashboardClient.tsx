"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertOctagon,
  Users2,
  RefreshCw,
  Calendar,
  Layers,
  Monitor,
  Flame,
  User,
  Compass,
  Laptop,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

interface Environment {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  environments: Environment[];
}

interface DashboardClientProps {
  org: {
    id: string;
    name: string;
    slug: string;
  };
  projects: Project[];
}

interface OverviewData {
  totalEvents: number;
  totalIssues: number;
  errorRate: number;
  affectedUsers: number;
  newIssuesToday: number;
  regressions: number;
}

interface TrendPoint {
  timestamp: string;
  eventCount: number;
  newIssueCount: number;
  affectedUserCount: number;
}

interface ReleaseStat {
  id: string;
  version: string;
  deployedAt: string;
  eventCount: number;
  newIssueCount: number;
  affectedUserCount: number;
  regressions: number;
  errorRate: number;
}

interface TopIssue {
  id: string;
  title: string;
  errorType: string;
  status: string;
  level: string;
  periodEventCount: number;
  affectedUserCount: number;
  lastSeenAt: string;
}

interface BreakdownItem {
  name: string;
  count: number;
}

interface UserBreakdownItem {
  id: string;
  email?: string;
  count: number;
}

interface Breakdowns {
  environments: BreakdownItem[];
  browsers: BreakdownItem[];
  operatingSystems: BreakdownItem[];
  devices: BreakdownItem[];
  users: UserBreakdownItem[];
}

export function DashboardClient({ org, projects }: DashboardClientProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(
    projects.length > 0 ? projects[0] : null
  );
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<"24h" | "7d" | "30d">("24h");

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data States
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [releases, setReleases] = useState<ReleaseStat[]>([]);
  const [topIssues, setTopIssues] = useState<TopIssue[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdowns | null>(null);

  // Chart Tooltip Hover State
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchDashboardData = useCallback(() => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }

    Promise.resolve().then(async () => {
      setLoading(true);
      setError(null);

      const query = `projectId=${selectedProject.id}&environmentId=${selectedEnvironment}&period=${selectedPeriod}`;

      try {
        const [overviewRes, trendsRes, releasesRes, issuesRes, envsRes] = await Promise.all([
          fetch(`/api/v1/analytics/overview?${query}`),
          fetch(`/api/v1/analytics/trends?${query}`),
          fetch(`/api/v1/analytics/releases?${query}`),
          fetch(`/api/v1/analytics/issues?${query}`),
          fetch(`/api/v1/analytics/environments?${query}`),
        ]);

        if (!overviewRes.ok || !trendsRes.ok || !releasesRes.ok || !issuesRes.ok || !envsRes.ok) {
          throw new Error("One or more analytics requests failed. Please try again.");
        }

        const [overviewData, trendsData, releasesData, issuesData, envsData] = await Promise.all([
          overviewRes.json(),
          trendsRes.json(),
          releasesRes.json(),
          issuesRes.json(),
          envsRes.json(),
        ]);

        setOverview(overviewData.data);
        setTrends(trendsData.data);
        setReleases(releasesData.data);
        setTopIssues(issuesData.data);
        setBreakdowns(envsData.data);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    });
  }, [selectedProject, selectedEnvironment, selectedPeriod]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  // Handle Project Change
  const handleProjectChange = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId) || null;
    setSelectedProject(proj);
    setSelectedEnvironment("");
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (selectedPeriod === "24h") {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Render SVG timeseries chart
  const renderTrendChart = () => {
    if (trends.length === 0) return null;

    const width = 800;
    const height = 240;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...trends.map((t) => t.eventCount), 10);

    // Generate path points
    const points = trends.map((t, index) => {
      const x = paddingLeft + (index / (trends.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (t.eventCount / maxVal) * chartHeight;
      return { x, y, val: t.eventCount, item: t };
    });

    // Create line path
    let linePath = "";
    let areaPath = "";

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y}`;
      points.forEach((p, idx) => {
        if (idx > 0) {
          linePath += ` L ${p.x} ${p.y}`;
        }
      });

      // Close the area path to the bottom for gradient fill
      areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${
        points[0].x
      } ${paddingTop + chartHeight} Z`;
    }

    return (
      <div className="relative bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">Error Volume Over Time</h3>
            <p className="text-xs text-zinc-500">Hourly event count aggregates for the period</p>
          </div>
          {hoveredIndex !== null && trends[hoveredIndex] && (
            <div className="text-right text-xs">
              <span className="text-zinc-500 mr-2">
                {new Date(trends[hoveredIndex].timestamp).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="font-semibold text-rose-400">
                {trends[hoveredIndex].eventCount} events
              </span>
            </div>
          )}
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[600px] h-60 select-none"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Y axis grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = paddingTop + chartHeight * ratio;
              const val = Math.round(maxVal * (1 - ratio));
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="#27272a"
                    strokeDasharray="4"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    fill="#71717a"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* X axis labels (sparse) */}
            {points.map((p, index) => {
              if (index % Math.ceil(trends.length / 6) === 0 || index === trends.length - 1) {
                return (
                  <text
                    key={index}
                    x={p.x}
                    y={height - 8}
                    fill="#71717a"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {formatDate(p.item.timestamp)}
                  </text>
                );
              }
              return null;
            })}

            {/* Area under the line */}
            {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

            {/* The main stroke line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Hover guideline and dots */}
            {points.map((p, index) => {
              const isHovered = hoveredIndex === index;
              return (
                <g key={index}>
                  {/* Invisible touch target column */}
                  <rect
                    x={p.x - chartWidth / (trends.length - 1) / 2}
                    y={paddingTop}
                    width={chartWidth / (trends.length - 1)}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                  />

                  {/* Vertical guideline */}
                  {isHovered && (
                    <line
                      x1={p.x}
                      y1={paddingTop}
                      x2={p.x}
                      y2={paddingTop + chartHeight}
                      stroke="#52525b"
                      strokeWidth="1.5"
                      strokeDasharray="2"
                    />
                  )}

                  {/* Interactive dot */}
                  {isHovered && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="5"
                      fill="#f43f5e"
                      stroke="#18181b"
                      strokeWidth="2"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertOctagon className="h-16 w-16 text-zinc-600 mb-4 stroke-1" />
        <h2 className="text-xl font-bold text-zinc-200">No Projects Found</h2>
        <p className="mt-2 text-zinc-500 max-w-sm">
          Create a project to start gathering error analytics and insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-rose-500" />
            Analytics & Insights
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time trends, release health, and user impact breakdowns for {org.name}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Switcher */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Project
            </label>
            <select
              value={selectedProject?.id || ""}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-700 cursor-pointer"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Environment Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Environment
            </label>
            <select
              value={selectedEnvironment}
              onChange={(e) => setSelectedEnvironment(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-700 cursor-pointer"
            >
              <option value="">All Environments</option>
              {selectedProject?.environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time range switcher */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Time Period
            </label>
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              {(["24h", "7d", "30d"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    selectedPeriod === period
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Manual refresh button */}
          <div className="flex flex-col gap-1 justify-end pt-5">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-50 transition-all cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-900/60 rounded-xl p-4 flex items-center justify-between text-red-400 text-sm">
          <span>{error}</span>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1 text-xs font-bold hover:underline cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {loading && !overview ? (
        // Skeleton loader
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 h-24 animate-pulse"
              />
            ))}
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl h-64 animate-pulse" />
        </div>
      ) : (
        <>
          {/* KPI Widget Cards */}
          {overview && (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Card 1: Total Events */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700/50 transition-all">
                <div className="flex justify-between items-start text-zinc-500 mb-2">
                  <span className="text-xs font-semibold">Total Events</span>
                  <Activity className="h-4 w-4 text-rose-500" />
                </div>
                <div className="text-xl font-bold text-white">{overview.totalEvents}</div>
                <p className="text-[10px] text-zinc-500 mt-1">Aggregated raw volume</p>
              </div>

              {/* Card 2: Total Issues */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700/50 transition-all">
                <div className="flex justify-between items-start text-zinc-500 mb-2">
                  <span className="text-xs font-semibold">Total Issues</span>
                  <AlertOctagon className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-xl font-bold text-white">{overview.totalIssues}</div>
                <p className="text-[10px] text-zinc-500 mt-1">Unique error groupings</p>
              </div>

              {/* Card 3: Error Rate */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700/50 transition-all">
                <div className="flex justify-between items-start text-zinc-500 mb-2">
                  <span className="text-xs font-semibold">Error Rate</span>
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
                <div className="text-xl font-bold text-white">{overview.errorRate}%</div>
                <p className="text-[10px] text-zinc-500 mt-1">Calculated platform health</p>
              </div>

              {/* Card 4: Affected Users */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700/50 transition-all">
                <div className="flex justify-between items-start text-zinc-500 mb-2">
                  <span className="text-xs font-semibold">Affected Users</span>
                  <Users2 className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-xl font-bold text-white">{overview.affectedUsers}</div>
                <p className="text-[10px] text-zinc-500 mt-1">Unique external identities</p>
              </div>

              {/* Card 5: New Issues Today */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700/50 transition-all">
                <div className="flex justify-between items-start text-zinc-500 mb-2">
                  <span className="text-xs font-semibold">New Issues</span>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-xl font-bold text-white">{overview.newIssuesToday}</div>
                <p className="text-[10px] text-zinc-500 mt-1">Discovered in last 24h</p>
              </div>

              {/* Card 6: Regressions */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700/50 transition-all">
                <div className="flex justify-between items-start text-zinc-500 mb-2">
                  <span className="text-xs font-semibold">Regressions</span>
                  <Layers className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-xl font-bold text-white">{overview.regressions}</div>
                <p className="text-[10px] text-zinc-500 mt-1">Reopened status triggers</p>
              </div>
            </div>
          )}

          {/* Time Series Chart */}
          {renderTrendChart()}

          {/* Grid Layout for Top Issues and Release Health */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Top Issues Table */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 flex flex-col">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-zinc-300">Top Issues</h3>
                <p className="text-xs text-zinc-500">
                  Most frequent exceptions in the select period
                </p>
              </div>

              <div className="flex-1 overflow-x-auto">
                {topIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
                    <CheckCircle className="h-8 w-8 text-zinc-600 mb-2" />
                    <span className="text-xs font-medium">No errors detected in this period</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800/85 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="py-2.5">Issue</th>
                        <th className="py-2.5 text-center">Status</th>
                        <th className="py-2.5 text-right">Events</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40 text-xs">
                      {topIssues.map((issue) => (
                        <tr key={issue.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 pr-4 max-w-xs md:max-w-md truncate">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 uppercase ${
                                issue.level === "fatal"
                                  ? "bg-red-950 text-red-400 border border-red-900/50"
                                  : issue.level === "warning"
                                    ? "bg-amber-950 text-amber-400 border border-amber-900/50"
                                    : "bg-zinc-800 text-zinc-300"
                              }`}
                            >
                              {issue.level}
                            </span>
                            <span className="font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer">
                              {issue.title}
                            </span>
                            <span className="block text-[10px] text-zinc-500 mt-1">
                              {issue.errorType}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 uppercase">
                              {issue.status.toLowerCase()}
                            </span>
                          </td>
                          <td className="py-3 text-right font-bold text-zinc-300">
                            {issue.periodEventCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Release Health Table */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 flex flex-col">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-zinc-300">Release Stability</h3>
                <p className="text-xs text-zinc-500">Stability metrics across deployed versions</p>
              </div>

              <div className="flex-1 overflow-x-auto">
                {releases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
                    <Layers className="h-8 w-8 text-zinc-600 mb-2" />
                    <span className="text-xs font-medium">
                      No releases configured for this project
                    </span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800/85 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="py-2.5">Version</th>
                        <th className="py-2.5 text-center">New Issues</th>
                        <th className="py-2.5 text-center">Error Rate</th>
                        <th className="py-2.5 text-right">Events</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40 text-xs">
                      {releases.map((rel) => (
                        <tr key={rel.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3">
                            <div className="font-semibold text-zinc-300">{rel.version}</div>
                            <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(rel.deployedAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                          </td>
                          <td className="py-3 text-center text-zinc-400 font-medium">
                            {rel.newIssueCount}
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                rel.errorRate > 5
                                  ? "text-red-400 bg-red-950/20 border border-red-900/45"
                                  : rel.errorRate > 1
                                    ? "text-amber-400 bg-amber-950/20 border border-amber-900/45"
                                    : "text-emerald-400 bg-emerald-950/20 border border-emerald-900/45"
                              }`}
                            >
                              {rel.errorRate}%
                            </span>
                          </td>
                          <td className="py-3 text-right font-bold text-zinc-300">
                            {rel.eventCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Breakdown Widgets Grid */}
          {breakdowns && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Widget 1: Environments */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-zinc-500" />
                  Environments
                </h4>
                {breakdowns.environments.length === 0 ? (
                  <span className="text-xs text-zinc-600 block py-6 text-center">No data</span>
                ) : (
                  <div className="space-y-3.5">
                    {breakdowns.environments.map((env, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-zinc-300">
                          <span>{env.name}</span>
                          <span>{env.count}</span>
                        </div>
                        <div className="w-full bg-zinc-850 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{
                              width: `${(env.count / (overview?.totalEvents || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Widget 2: Browsers */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Monitor className="h-3.5 w-3.5 text-zinc-500" />
                  Browsers
                </h4>
                {breakdowns.browsers.length === 0 ? (
                  <span className="text-xs text-zinc-600 block py-6 text-center">No data</span>
                ) : (
                  <div className="space-y-3.5">
                    {breakdowns.browsers.slice(0, 5).map((browser, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-zinc-300">
                          <span>{browser.name}</span>
                          <span>{browser.count}</span>
                        </div>
                        <div className="w-full bg-zinc-850 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{
                              width: `${(browser.count / (overview?.totalEvents || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Widget 3: OS & Devices */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 flex flex-col gap-6">
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                    <Laptop className="h-3.5 w-3.5 text-zinc-500" />
                    OS & Devices
                  </h4>
                  {breakdowns.operatingSystems.length === 0 ? (
                    <span className="text-xs text-zinc-600 block py-3 text-center">No data</span>
                  ) : (
                    <div className="space-y-2">
                      {breakdowns.operatingSystems.slice(0, 3).map((os, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-xs font-semibold text-zinc-300"
                        >
                          <span className="text-zinc-500">{os.name}</span>
                          <span>{os.count}</span>
                        </div>
                      ))}
                      {breakdowns.devices.slice(0, 2).map((dev, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-xs font-semibold text-zinc-300 border-t border-zinc-800/30 pt-2 mt-2"
                        >
                          <span className="text-zinc-500">{dev.name}</span>
                          <span>{dev.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Widget 4: Top Affected Users */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                  Top Affected Users
                </h4>
                {breakdowns.users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-zinc-600 text-xs">
                    <HelpCircle className="h-6 w-6 text-zinc-700 mb-1" />
                    <span>No user context available</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {breakdowns.users.slice(0, 5).map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs bg-zinc-950/30 rounded-lg p-2 border border-zinc-800/35"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="block font-bold text-zinc-300 truncate">
                            {u.email || u.id}
                          </span>
                          <span className="text-[10px] text-zinc-500 block truncate">
                            ID: {u.id}
                          </span>
                        </div>
                        <span className="font-extrabold text-rose-400 shrink-0 bg-rose-950/20 border border-rose-900/40 px-1.5 py-0.5 rounded text-[10px]">
                          {u.count} errors
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
