import React from 'react';
import { motion } from 'motion/react';

export default function Reveal({
  children,
  className = '',
  delay = 0,
  y = 22,
  once = true,
  amount = 0.15,
  as = 'div',
  ...rest
}) {
  const Tag = as === 'div' ? motion.div : motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
