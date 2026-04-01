import React from 'react'
import { NavLink } from 'react-router-dom'
import * as Tooltip from '@radix-ui/react-tooltip'

function getNavItemStyle(isActive, collapsed) {
  return {
    width: '100%',
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: 10,
    padding: collapsed ? '0' : '0 1.25rem',
    boxSizing: 'border-box',
    background: isActive ? 'var(--accent-dim)' : 'transparent',
    borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
    color: isActive ? '#5f7d15' : 'var(--text-2)',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: isActive ? 700 : 500,
    fontFamily: 'var(--font-body)',
    transition: 'all 0.18s ease',
  }
}

function NavItemLink({ item, collapsed }) {
  const Icon = item.icon

  return (
    <NavLink to={item.to} style={({ isActive }) => getNavItemStyle(isActive, collapsed)}>
      <Icon
        size={18}
        style={{
          flexShrink: 0,
          display: 'block',
          color: 'currentColor',
        }}
      />
      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
    </NavLink>
  )
}

export default function SidebarNavItem({ item, collapsed }) {
  if (!collapsed) {
    return (
      <div
        style={{
          width: '100%',
          padding: '3px 0',
          boxSizing: 'border-box',
        }}
      >
        <NavItemLink item={item} collapsed={false} />
      </div>
    )
  }

  return (
    <Tooltip.Provider delayDuration={120}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            style={{
              width: '100%',
              padding: '3px 0',
              boxSizing: 'border-box',
            }}
          >
            <NavItemLink item={item} collapsed />
          </div>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={10}
            style={{
              background: 'var(--bg-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 12,
              lineHeight: 1,
              boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
              zIndex: 1000,
            }}
          >
            {item.label}
            <Tooltip.Arrow
              style={{
                fill: 'var(--bg-2)',
              }}
            />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}