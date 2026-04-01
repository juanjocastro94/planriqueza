import React from 'react'
import logoWhite from '../assets/brand/logo-compas-white.svg'
import logoBlack from '../assets/brand/logo-compas-black.svg'

export default function Brand({
  variant = 'white',
  height = 26,
  href = null,
  alt = 'Compás',
}) {
  const src = variant === 'black' ? logoBlack : logoWhite

  const image = (
    <img
      src={src}
      alt={alt}
      style={{
        height,
        width: 'auto',
        display: 'block',
      }}
    />
  )

  if (href) {
    return (
      <a href={href} style={{ display: 'inline-flex', alignItems: 'center' }}>
        {image}
      </a>
    )
  }

  return <div style={{ display: 'inline-flex', alignItems: 'center' }}>{image}</div>
}