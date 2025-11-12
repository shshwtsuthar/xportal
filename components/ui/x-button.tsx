'use client';

import * as React from 'react';

import { motion, type HTMLMotionProps, type Transition } from 'motion/react';

import type { VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

import { buttonVariants } from '@/components/ui/button';

import { usePhysicsButton } from '@/lib/usePhysicsButton';

interface Position {
  x: number;
  y: number;
}

interface XButtonProps
  extends HTMLMotionProps<'button'>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  scale?: number;
  transition?: Transition;
}

function XButton({
  children,
  className,
  size,
  variant,
  onClick,
  disabled,
  ...props
}: XButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<Position>({ x: 0, y: 0 });
  const [physicsActive, setPhysicsActive] = React.useState(false);
  const [isPhysicsComplete, setIsPhysicsComplete] = React.useState(false);

  // Initialize physics behavior
  const { reset: resetPhysics } = usePhysicsButton(ref, {
    isActive: physicsActive,
    onLand: () => {
      // Physics simulation complete
      setIsPhysicsComplete(true);
    },
  });

  // Auto-reset after physics completes
  React.useEffect(() => {
    if (isPhysicsComplete) {
      const timeoutId = setTimeout(() => {
        resetPhysics();
        setPhysicsActive(false);
        setIsPhysicsComplete(false);
        setPosition({ x: 0, y: 0 });
      }, 1500); // 1.5 second delay before reset

      return () => clearTimeout(timeoutId);
    }
  }, [isPhysicsComplete, resetPhysics]);

  const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Only respond to mouse events if physics is not active
    if (physicsActive) return;

    if (ref.current) {
      const { clientX, clientY } = e;
      const { height, width, left, top } = ref.current.getBoundingClientRect();
      const middleX = clientX - (left + width / 2);
      const middleY = clientY - (top + height / 2);
      setPosition({ x: middleX, y: middleY });
    }
  };

  const reset = () => {
    if (!physicsActive) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // Handle mouse down on wrapper (works even when button is disabled)
  const handleWrapperMouseDown = () => {
    // 90% chance to trigger physics on mouse down
    const shouldTriggerPhysics = Math.random() < 0.9 && !physicsActive;
    console.log(
      'XButton wrapper mouseDown - shouldTriggerPhysics:',
      shouldTriggerPhysics,
      'physicsActive:',
      physicsActive,
      'disabled:',
      disabled
    );

    if (shouldTriggerPhysics) {
      console.log('Triggering physics...');
      setPhysicsActive(true);
      setPosition({ x: 0, y: 0 }); // Stop magnetic effect
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Call original onClick if provided (only fires if button is not disabled)
    onClick?.(e);
  };

  const { x, y } = position;

  return (
    <div
      ref={wrapperRef}
      onMouseDown={handleWrapperMouseDown}
      className="inline-block"
      style={{ pointerEvents: 'auto' }}
    >
      <motion.button
        ref={ref}
        onMouseMove={handleMouse}
        onMouseLeave={reset}
        onClick={handleClick}
        animate={!physicsActive ? { x, y } : undefined}
        transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
        whileTap={!physicsActive ? { scale: 0.95 } : undefined}
        disabled={disabled}
        className={cn(
          buttonVariants({ variant, size }),
          'relative transition-none',
          physicsActive && 'pointer-events-none',
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    </div>
  );
}

export { XButton, type XButtonProps };
