'use client';

// =====================================================
// GRÁFICO SVG DE INGRESO VS CONSUMO MENSUAL
// =====================================================
// Sin dependencias externas. Barras lado a lado por mes.

interface ConsumoChartProps {
    meses: string[];
    ingresos: number[];
    consumos: number[];
    height?: number;
    compact?: boolean; // para panel lateral
}

export default function ConsumoChart({
    meses,
    ingresos,
    consumos,
    height = 180,
    compact = false,
}: ConsumoChartProps) {
    if (meses.length === 0) {
        return (
            <div className="flex items-center justify-center text-xs text-[var(--text-muted)] py-6">
                Sin datos de movimientos
            </div>
        );
    }

    const maxVal = Math.max(...ingresos, ...consumos, 1);
    const totalMeses = meses.length;

    // Dimensiones
    const marginLeft = compact ? 30 : 45;
    const marginBottom = compact ? 20 : 28;
    const marginTop = 8;
    const marginRight = 8;
    const chartWidth = compact ? 280 : 700;
    const totalWidth = chartWidth + marginLeft + marginRight;
    const totalHeight = height + marginTop + marginBottom;
    const chartHeight = height - marginTop;

    const barGroupWidth = chartWidth / totalMeses;
    const barWidth = Math.max(2, barGroupWidth * 0.35);
    const gap = Math.max(1, barGroupWidth * 0.04);

    // Escala Y
    const yScale = (val: number) => chartHeight - (val / maxVal) * chartHeight;

    // Líneas de referencia
    const yTicks = 4;
    const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => (maxVal / yTicks) * i);

    function formatNum(n: number): string {
        if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
        return n.toFixed(0);
    }

    return (
        <div className="w-full overflow-x-auto">
            <svg
                width="100%"
                viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                className="select-none"
                style={{ maxWidth: `${totalWidth}px` }}
            >
                {/* Grid lines */}
                {tickVals.map((v, i) => (
                    <g key={i}>
                        <line
                            x1={marginLeft}
                            y1={marginTop + yScale(v)}
                            x2={marginLeft + chartWidth}
                            y2={marginTop + yScale(v)}
                            stroke="var(--border-default)"
                            strokeWidth={0.5}
                            strokeDasharray={i === 0 ? '' : '3,3'}
                        />
                        <text
                            x={marginLeft - 4}
                            y={marginTop + yScale(v) + 3}
                            textAnchor="end"
                            fontSize={compact ? 7 : 9}
                            fill="var(--text-muted)"
                        >
                            {formatNum(v)}
                        </text>
                    </g>
                ))}

                {/* Bars */}
                {meses.map((mes, i) => {
                    const x = marginLeft + i * barGroupWidth + barGroupWidth * 0.12;
                    const ingVal = ingresos[i] || 0;
                    const conVal = consumos[i] || 0;

                    return (
                        <g key={i}>
                            {/* Ingreso (azul) */}
                            {ingVal > 0 && (
                                <rect
                                    x={x}
                                    y={marginTop + yScale(ingVal)}
                                    width={barWidth}
                                    height={chartHeight - yScale(ingVal)}
                                    rx={1}
                                    fill="#3b82f6"
                                    opacity={0.8}
                                >
                                    <title>{mes}: Ingreso {ingVal.toLocaleString('es-AR')}</title>
                                </rect>
                            )}
                            {/* Consumo (rojo/amber) */}
                            {conVal > 0 && (
                                <rect
                                    x={x + barWidth + gap}
                                    y={marginTop + yScale(conVal)}
                                    width={barWidth}
                                    height={chartHeight - yScale(conVal)}
                                    rx={1}
                                    fill="#ef4444"
                                    opacity={0.7}
                                >
                                    <title>{mes}: Consumo {conVal.toLocaleString('es-AR')}</title>
                                </rect>
                            )}
                            {/* Label eje X */}
                            {(!compact || i % 2 === 0) && (
                                <text
                                    x={x + barWidth}
                                    y={marginTop + chartHeight + (compact ? 10 : 14)}
                                    textAnchor="middle"
                                    fontSize={compact ? 6 : 8}
                                    fill="var(--text-muted)"
                                >
                                    {mes}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Leyenda */}
                <g transform={`translate(${marginLeft}, ${totalHeight - (compact ? 3 : 5)})`}>
                    <rect width={8} height={4} fill="#3b82f6" rx={1} opacity={0.8} />
                    <text x={10} y={4} fontSize={compact ? 7 : 8} fill="var(--text-muted)">Ingreso</text>
                    <rect x={compact ? 40 : 55} width={8} height={4} fill="#ef4444" rx={1} opacity={0.7} />
                    <text x={compact ? 50 : 65} y={4} fontSize={compact ? 7 : 8} fill="var(--text-muted)">Consumo</text>
                </g>
            </svg>
        </div>
    );
}
