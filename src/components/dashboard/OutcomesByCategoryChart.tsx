'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { Entry } from '@/lib/entries/mongodb-documents';

interface ChartEntry {
  category: Entry.Category;
  label: string;
  total: number;
}

interface Props {
  data: ChartEntry[];
  month: { year: number; month: number };
}

const COLORS = [
  '#4C72B0',
  '#DD8452',
  '#55A868',
  '#C44E52',
  '#8172B3',
  '#937860',
  '#DA8BC3',
  '#8C8C8C',
  '#CCB974',
  '#64B5CD',
  '#E377C2',
  '#7F7F7F',
  '#BCBD22',
  '#17BECF',
  '#AEC7E8',
  '#FFBB78',
  '#98DF8A',
];

function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

function formatMonthTitle(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  const name = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return `${name} Outcomes By Category`;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: { percentage: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const item = payload?.[0];
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        px: 1.5,
        py: 1,
        opacity: active && item ? 1 : 0,
        transition: 'opacity 0.1s ease',
        pointerEvents: 'none',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {item ? `${item.name} (${item.payload.percentage}%)` : ''}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {item ? formatBRL(item.value) : ''}
      </Typography>
    </Box>
  );
}

export default function OutcomesByCategoryChart({ data, month }: Props) {
  const title = formatMonthTitle(month.year, month.month);

  const grandTotal = data.reduce((sum, e) => sum + e.total, 0);
  const dataWithPercentage = data.map((e) => ({
    ...e,
    percentage: grandTotal > 0 ? Math.round((e.total / grandTotal) * 100) : 0,
  }));

  return (
    <Box>
      <Typography variant="h6" component="h2" color="text.primary" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {dataWithPercentage.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No outcome entries for this month yet.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={dataWithPercentage}
              dataKey="total"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={55}
              paddingAngle={2}
            >
              {dataWithPercentage.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              isAnimationActive={false}
              wrapperStyle={{ visibility: 'visible', pointerEvents: 'none' }}
            />
            <Legend
              iconType="circle"
              iconSize={10}
              formatter={(value) => (
                <Typography component="span" variant="caption" color="text.secondary">
                  {value}
                </Typography>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}
