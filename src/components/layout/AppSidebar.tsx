'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

type NavItemConfig = { label: string; href: string; Icon: React.ElementType };

const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard/home', Icon: HomeRoundedIcon },
  { label: 'Statement', href: '/dashboard/statement', Icon: ReceiptLongRoundedIcon },
  { label: 'Credit Cards', href: '/dashboard/credit-cards', Icon: CreditCardRoundedIcon },
  { label: 'Tagging Rules', href: '/dashboard/tagging-rules', Icon: SellRoundedIcon },
  { label: 'Investments', href: '/dashboard/investments', Icon: TrendingUpRoundedIcon },
  { label: 'Objectives', href: '/dashboard/objectives', Icon: EmojiEventsRoundedIcon },
] satisfies NavItemConfig[];

function NavItem({
  label,
  href,
  Icon,
  active,
}: {
  label: string;
  href: string;
  Icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Tooltip title={label} placement="right" arrow>
      <IconButton
        component={Link}
        href={href}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        sx={{
          width: 46,
          height: 46,
          borderRadius: 2.5,
          color: active ? 'primary.dark' : 'text.secondary',
          bgcolor: active ? 'primary.light' : 'transparent',
          '&:hover': {
            bgcolor: active
              ? 'primary.light'
              : 'rgba(136, 201, 161, 0.12)',
            color: active ? 'primary.dark' : 'text.primary',
          },
          transition: 'background-color 180ms ease, color 180ms ease',
        }}
      >
        <Icon sx={{ fontSize: 22 }} />
      </IconButton>
    </Tooltip>
  );
}

function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' });
    } finally {
      window.location.href = '/';
    }
  }

  return (
    <Tooltip title="Sign out" placement="right" arrow>
      <span>
        <IconButton
          onClick={() => void handleSignOut()}
          disabled={pending}
          aria-label="Sign out"
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2.5,
            color: 'text.secondary',
            '&:hover': {
              bgcolor: 'rgba(211, 47, 47, 0.08)',
              color: 'error.main',
            },
            transition: 'background-color 180ms ease, color 180ms ease',
          }}
        >
          {pending ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <LogoutRoundedIcon sx={{ fontSize: 22 }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        width: 72,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 2,
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Brand mark */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 700,
            color: 'primary.contrastText',
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          BT
        </Typography>
      </Box>

      <Divider sx={{ width: 40, mb: 2 }} />

      {/* Nav items */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.75,
          flexGrow: 1,
        }}
      >
        {NAV_ITEMS.map(({ label, href, Icon }) => (
          <NavItem
            key={href}
            label={label}
            href={href}
            Icon={Icon}
            active={pathname === href || pathname.startsWith(`${href}/`)}
          />
        ))}
      </Box>

      {/* Sign out */}
      <SignOutButton />
    </Box>
  );
}
