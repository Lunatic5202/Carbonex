import React from 'react';

export function Button({ className = '', variant = 'default', size = 'default', children, ...props }) {
  return <button className={`ui-button ui-button-${variant} ui-button-${size} ${className}`} {...props}>{children}</button>;
}
