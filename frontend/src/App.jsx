import { useEffect, useState } from "react";
import axios from "axios";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
} from "chart.js";

import { Line } from "react-chartjs-2";

import "./App.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
);

function App() {

    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {

        const fetchData = async () => {

            try {

                const statsResponse = await axios.get(
                    "http://localhost:7000/stats"
                );

                const historyResponse = await axios.get(
                    "http://localhost:7000/history"
                );

                setStats(statsResponse.data);
                setHistory(historyResponse.data);

            } catch (error) {

                console.log("Could not fetch CDN data");

            }
        };

        fetchData();

        const interval = setInterval(fetchData, 5000);

        return () => {
            clearInterval(interval);
        };

    }, []);


    if (!stats) {

        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "#0b0f14",
                    color: "white",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "24px"
                }}
            >
                Loading CDN Dashboard...
            </div>
        );

    }


    // ==========================================
    // CACHE HIT RATE CHART
    // ==========================================

    const hitRateChartData = {

        labels: history.map(
            item => item.time
        ),

        datasets: [
            {
                label: "Cache Hit Rate (%)",

                data: history.map(
                    item => item.cacheHitRate
                ),

                borderColor: "#ff3b30",

                backgroundColor: "#ff3b30",

                pointBackgroundColor: "#ff3b30",

                pointBorderColor: "#ff3b30",

                pointRadius: 3,

                borderWidth: 2,

                tension: 0.3
            }
        ]

    };


    const hitRateChartOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                labels: {
                    color: "#e2e8f0"
                }
            }

        },

        scales: {

            x: {

                ticks: {
                    color: "#94a3b8"
                },

                grid: {
                    color: "#252a33"
                }

            },

            y: {

                beginAtZero: true,

                max: 100,

                ticks: {
                    color: "#94a3b8"
                },

                grid: {
                    color: "#252a33"
                }

            }

        }

    };


    // ==========================================
    // REQUEST TRAFFIC CHART
    // ==========================================

    const requestChartData = {

        labels: history.map(
            item => item.time
        ),

        datasets: [
            {
                label: "Total Requests",

                data: history.map(
                    item => item.requests
                ),

                borderColor: "#39ff14",

                backgroundColor: "#39ff14",

                pointBackgroundColor: "#39ff14",

                pointBorderColor: "#39ff14",

                pointRadius: 3,

                borderWidth: 2,

                tension: 0.3
            }
        ]

    };


    const requestChartOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                labels: {
                    color: "#e2e8f0"
                }
            }

        },

        scales: {

            x: {

                ticks: {
                    color: "#94a3b8"
                },

                grid: {
                    color: "#252a33"
                }

            },

            y: {

                beginAtZero: true,

                ticks: {
                    color: "#94a3b8"
                },

                grid: {
                    color: "#252a33"
                }

            }

        }

    };


    return (

        <div
            style={{
                minHeight: "100vh",
                background: "#0b0f14",
                color: "#f8fafc",
                padding: "35px 45px",
                fontFamily: "Arial, Helvetica, sans-serif"
            }}
        >

            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "35px"
                }}
            >

                <div>

                    <h1
                        style={{
                            margin: 0,
                            fontSize: "32px"
                        }}
                    >
                        Mini CDN Dashboard
                    </h1>

                    <p
                        style={{
                            margin: "7px 0 0",
                            color: "#64748b",
                            fontSize: "14px"
                        }}
                    >
                        Real-time CDN monitoring
                    </p>

                </div>


                {/* LIVE */}

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 14px",
                        borderRadius: "20px",
                        background: "rgba(57,255,20,0.08)",
                        border: "1px solid rgba(57,255,20,0.25)",
                        color: "#39ff14",
                        fontSize: "12px",
                        fontWeight: "bold"
                    }}
                >

                    <span
                        style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#39ff14",
                            boxShadow: "0 0 8px #39ff14"
                        }}
                    />

                    LIVE

                </div>

            </div>


            {/* ================================= */}
            {/* SUMMARY CARDS */}
            {/* ================================= */}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(5, minmax(0, 1fr))",
                    gap: "16px",
                    marginBottom: "28px"
                }}
            >

                <SummaryCard
                    title="Total Requests"
                    value={stats.total.requests}
                />

                <SummaryCard
                    title="Cache Hits"
                    value={stats.total.cacheHits}
                    valueColor="#39ff14"
                />

                <SummaryCard
                    title="Cache Misses"
                    value={stats.total.cacheMisses}
                    valueColor="#ff3b30"
                />

                <SummaryCard
                    title="Cache Hit Rate"
                    value={stats.total.cacheHitRate}
                    valueColor="#39ff14"
                />

                <SummaryCard
                    title="LRU Evictions"
                    value={stats.total.cacheEvictions}
                />

            </div>


            {/* ================================= */}
            {/* CACHE HIT RATE */}
            {/* ================================= */}

            <ChartCard title="Cache Hit Rate History (%)">

                <Line
                    data={hitRateChartData}
                    options={hitRateChartOptions}
                />

            </ChartCard>


            {/* ================================= */}
            {/* REQUEST TRAFFIC */}
            {/* ================================= */}

            <ChartCard title="Request Traffic (Total Requests)">

                <Line
                    data={requestChartData}
                    options={requestChartOptions}
                />

            </ChartCard>


            {/* ================================= */}
            {/* EDGE SERVERS HEADER */}
            {/* ================================= */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "35px",
                    marginBottom: "18px"
                }}
            >

                <h2
                    style={{
                        margin: 0,
                        fontSize: "22px"
                    }}
                >
                    Edge Servers
                </h2>

                <span
                    style={{
                        color: "#64748b",
                        fontSize: "13px"
                    }}
                >
                    {Object.keys(stats.edges).length} Servers
                </span>

            </div>


            {/* ================================= */}
            {/* EDGE SERVER CARDS */}
            {/* ================================= */}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                    gap: "20px",
                    alignItems: "stretch"
                }}
            >

                {Object.entries(stats.edges).map(
                    ([name, edge]) => (

                        <EdgeCard
                            key={name}
                            name={name}
                            edge={edge}
                        />

                    )
                )}

            </div>

        </div>

    );

}


/* ==================================================
   SUMMARY CARD COMPONENT
================================================== */

function SummaryCard({
    title,
    value,
    valueColor = "#f8fafc"
}) {

    return (

        <div
            style={{
                background: "#12171e",
                border: "1px solid #222a34",
                borderRadius: "12px",
                padding: "20px",
                minHeight: "115px"
            }}
        >

            <div
                style={{
                    color: "#94a3b8",
                    fontSize: "13px",
                    marginBottom: "14px"
                }}
            >
                {title}
            </div>

            <div
                style={{
                    fontSize: "30px",
                    fontWeight: "700",
                    color: valueColor
                }}
            >
                {value}
            </div>

        </div>

    );

}


/* ==================================================
   CHART CARD COMPONENT
================================================== */

function ChartCard({
    title,
    children
}) {

    return (

        <div
            style={{
                background: "#12171e",
                border: "1px solid #222a34",
                borderRadius: "12px",
                padding: "22px 24px",
                marginBottom: "22px"
            }}
        >

            <h2
                style={{
                    margin: "0 0 20px",
                    fontSize: "19px"
                }}
            >
                {title}
            </h2>

            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "310px"
                }}
            >

                {children}

            </div>

        </div>

    );

}


/* ==================================================
   EDGE CARD COMPONENT
================================================== */

function EdgeCard({
    name,
    edge
}) {

    const isHealthy = edge.healthy;


    return (

        <div
            style={{
                background: "#12171e",
                border: "1px solid #222a34",
                borderRadius: "14px",
                padding: "24px",
                minHeight: "300px",
                display: "flex",
                flexDirection: "column"
            }}
        >

            {/* EDGE NAME */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px"
                }}
            >

                <h3
                    style={{
                        margin: 0,
                        fontSize: "21px",
                        letterSpacing: "0.5px"
                    }}
                >
                    {name.toUpperCase()}
                </h3>


                {/* STATUS */}

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",

                        padding: "7px 12px",

                        borderRadius: "20px",

                        background: isHealthy
                            ? "rgba(57,255,20,0.10)"
                            : "rgba(255,59,48,0.10)",

                        border: isHealthy
                            ? "1px solid rgba(57,255,20,0.30)"
                            : "1px solid rgba(255,59,48,0.30)",

                        color: isHealthy
                            ? "#39ff14"
                            : "#ff3b30",

                        fontSize: "13px",

                        fontWeight: "600"
                    }}
                >

                    <span
                        style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: isHealthy
                                ? "#39ff14"
                                : "#ff3b30",

                            boxShadow: isHealthy
                                ? "0 0 8px #39ff14"
                                : "0 0 8px #ff3b30"
                        }}
                    />

                    {isHealthy
                        ? "Healthy"
                        : "Unhealthy"}

                </div>

            </div>


            {/* DIVIDER */}

            <div
                style={{
                    height: "1px",
                    background: "#222a34",
                    marginBottom: "10px"
                }}
            />


            {/* METRICS */}

            <MetricRow
                label="Latency"
                value={
                    edge.latency !== null
                        ? `${edge.latency} ms`
                        : "N/A"
                }
            />

            <MetricRow
                label="Requests"
                value={edge.requests ?? 0}
            />

            <MetricRow
                label="Cache Hits"
                value={edge.cacheHits ?? 0}
            />

            <MetricRow
                label="Cache Misses"
                value={edge.cacheMisses ?? 0}
            />

            <MetricRow
                label="Cached Files"
                value={edge.cachedFiles ?? 0}
            />

            <MetricRow
                label="LRU Evictions"
                value={edge.cacheEvictions ?? 0}
            />

        </div>

    );

}


/* ==================================================
   METRIC ROW
================================================== */

function MetricRow({
    label,
    value
}) {

    return (

        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",

                padding: "11px 0",

                borderBottom:
                    "1px solid rgba(34,42,52,0.7)"
            }}
        >

            <span
                style={{
                    color: "#64748b",
                    fontSize: "14px"
                }}
            >
                {label}
            </span>

            <strong
                style={{
                    color: "#e2e8f0",
                    fontSize: "14px"
                }}
            >
                {value}
            </strong>

        </div>

    );

}

export default App;