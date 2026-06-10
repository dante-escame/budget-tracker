'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MobileStepper from '@mui/material/MobileStepper';
import Typography from '@mui/material/Typography';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
} from 'recharts';

import type { Investment } from '@/lib/investments';
import {
  CATEGORY_COLOR,
  CATEGORY_LABELS,
  CHART_COLORS,
} from '@/components/investments/constants';
import { formatCurrency } from '@/components/investments/format';

const STEP_LABELS = ['By Category', 'All Positions', 'Fixed Income', 'Stocks'];
const TOTAL_STEPS = 4;

function withPercentage<T extends { value: number }>(
  items: T[]
): (T & { percentage: number })[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return items.map((item) => ({
    ...item,
    percentage: total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0,
  }));
}

interface TooltipItem {
  name: string;
  value: number;
  payload: { percentage: number };
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipItem[];
}) {
  const item = payload?.[0];
  if (!active || !item) return null;
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        px: 1.5,
        py: 1,
        pointerEvents: 'none',
      }}
    >
      <Typography variant="body2" fontWeight={600}>
        {item.name} ({item.payload.percentage}%)
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formatCurrency(item.value, 'BRL')}
      </Typography>
    </Box>
  );
}

export function InvestmentChartSlider({
  positions,
}: {
  positions: Investment.PositionRecord[];
}) {
  const [activeStep, setActiveStep] = useState(0);

  const categoryData = useMemo(() => {
    const totals: Partial<Record<Investment.Category, number>> = {};
    for (const pos of positions) {
      totals[pos.category] = (totals[pos.category] ?? 0) + pos.currentValue;
    }
    const raw = Object.entries(totals)
      .filter(([, value]) => value > 0)
      .map(([category, value]) => ({
        name: CATEGORY_LABELS[category as Investment.Category],
        value,
        fill: CATEGORY_COLOR[category as Investment.Category],
      }));
    return withPercentage(raw);
  }, [positions]);

  const pieData = useMemo(() => {
    const raw = positions
      .filter((pos) => pos.currentValue > 0)
      .map((pos) => ({
        name: pos.name,
        value: pos.currentValue,
        category: pos.category,
      }));
    return withPercentage(raw);
  }, [positions]);

  const fixedIncomeData = useMemo(() => {
    const raw = positions
      .filter((pos) => pos.category === 'fixed_income' && pos.currentValue > 0)
      .map((pos) => ({ name: pos.name, value: pos.currentValue }));
    return withPercentage(raw);
  }, [positions]);

  const stocksData = useMemo(() => {
    const raw = positions
      .filter((pos) => pos.category === 'stocks' && pos.currentValue > 0)
      .map((pos) => ({ name: pos.name, value: pos.currentValue }));
    return withPercentage(raw);
  }, [positions]);

  return (
    <Box sx={{ width: { xs: '100%', md: 360 }, flexShrink: 0 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>
        {STEP_LABELS[activeStep]}
      </Typography>

      {activeStep === 0 &&
        (categoryData.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              No applications yet to show category distribution.
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
              >
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<PieTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ))}

      {activeStep === 1 &&
        (pieData.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              Add an application or set a market value to see the distribution.
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLOR[entry.category]} />
                ))}
              </Pie>
              <ChartTooltip content={<PieTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ))}

      {activeStep === 2 &&
        (fixedIncomeData.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              No fixed income positions with applications yet.
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={fixedIncomeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
              >
                {fixedIncomeData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <ChartTooltip content={<PieTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ))}

      {activeStep === 3 &&
        (stocksData.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              No stocks positions with applications yet.
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stocksData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
              >
                {stocksData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <ChartTooltip content={<PieTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ))}

      <MobileStepper
        variant="dots"
        steps={TOTAL_STEPS}
        position="static"
        activeStep={activeStep}
        nextButton={
          <IconButton
            size="small"
            aria-label="Next slide"
            onClick={() => setActiveStep((s) => s + 1)}
            disabled={activeStep === TOTAL_STEPS - 1}
          >
            <KeyboardArrowRight />
          </IconButton>
        }
        backButton={
          <IconButton
            size="small"
            aria-label="Previous slide"
            onClick={() => setActiveStep((s) => s - 1)}
            disabled={activeStep === 0}
          >
            <KeyboardArrowLeft />
          </IconButton>
        }
      />
    </Box>
  );
}
