import React from 'react';

export function Card({ as: Component = 'div', className = '', children, ...props }) {
  return <Component className={`ui-card ${className}`} {...props}>{children}</Component>;
}

export function CardHeader({ className = '', children, ...props }) {
  return <div className={`ui-card-header ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ className = '', children, ...props }) {
  return <h3 className={`ui-card-title ${className}`} {...props}>{children}</h3>;
}

export function CardContent({ className = '', children, ...props }) {
  return <div className={`ui-card-content ${className}`} {...props}>{children}</div>;
}
