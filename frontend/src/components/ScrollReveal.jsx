import React from 'react';
import { motion } from 'motion/react';

export default function ScrollReveal({ children, className = '', delay = 0, amount = 0.18 }) {
  return <motion.div
    className={className}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount }}
    transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
  >{children}</motion.div>;
}
