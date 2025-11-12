'use client';

import { useEffect, useRef } from 'react';

interface PhysicsState {
  isActive: boolean;
  onLand?: () => void;
}

// Dynamic import for Matter.js (SSR-safe)
let Matter: typeof import('matter-js') | null = null;

const loadMatter = async (): Promise<typeof import('matter-js')> => {
  if (typeof window === 'undefined') {
    throw new Error('Matter.js can only be loaded on the client side');
  }

  if (!Matter) {
    const mod = await import('matter-js');
    Matter = mod.default || mod;
  }
  return Matter;
};

/**
 * Custom hook for physics-based button animation using Matter.js
 * @param buttonRef - React ref to the button element
 * @param isActive - Whether physics simulation should be active
 * @param onLand - Callback function called when button lands
 * @returns Object with reset function to clean up physics
 */
export const usePhysicsButton = (
  buttonRef: React.RefObject<HTMLButtonElement | null>,
  { isActive, onLand }: PhysicsState
) => {
  const engineRef = useRef<import('matter-js').Engine | null>(null);
  const bodyRef = useRef<import('matter-js').Body | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const hasLandedRef = useRef(false);
  const initialPositionRef = useRef<{ top: number; left: number } | null>(null);

  useEffect(() => {
    console.log(
      'usePhysicsButton effect - isActive:',
      isActive,
      'buttonRef.current:',
      !!buttonRef.current
    );

    if (!isActive || !buttonRef.current) {
      console.log('Physics not active or button ref missing');
      return;
    }

    // Store initial position for reset
    const buttonRect = buttonRef.current.getBoundingClientRect();
    initialPositionRef.current = {
      top: buttonRect.top,
      left: buttonRect.left,
    };

    console.log('Loading Matter.js...');
    // Load Matter.js and initialize physics
    loadMatter()
      .then((M) => {
        console.log('Matter.js loaded successfully');
        if (!buttonRef.current) {
          console.log('Button ref lost during Matter.js load');
          return;
        }

        // Get viewport dimensions
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const buttonRect = buttonRef.current.getBoundingClientRect();

        // Create Matter.js engine
        const engine = M.Engine.create();
        engine.world.gravity.y = 1; // Gravity pulling down
        engine.world.gravity.scale = 0.001;
        engineRef.current = engine;

        const world = engine.world;

        // Create button body at current position
        const body = M.Bodies.rectangle(
          buttonRect.left + buttonRect.width / 2,
          buttonRect.top + buttonRect.height / 2,
          buttonRect.width,
          buttonRect.height,
          {
            restitution: 0.8, // Bounciness
            friction: 0.5,
            frictionAir: 0.02, // Air resistance
            density: 0.04,
          }
        );

        bodyRef.current = body;
        M.World.add(world, body);

        // Create ground (bottom boundary)
        const ground = M.Bodies.rectangle(
          viewportWidth / 2,
          viewportHeight + 50,
          viewportWidth * 2,
          100,
          { isStatic: true }
        );
        M.World.add(world, ground);

        // Set button to fixed position for physics animation
        if (buttonRef.current) {
          buttonRef.current.style.position = 'fixed';
          buttonRef.current.style.zIndex = '9999';
          buttonRef.current.style.left = `${buttonRect.left}px`;
          buttonRef.current.style.top = `${buttonRect.top}px`;
        }

        // Animation loop
        let isLanded = false;

        const animate = () => {
          if (!engineRef.current || !bodyRef.current || !buttonRef.current) {
            return;
          }

          M.Engine.update(engine);

          const { position, angle } = bodyRef.current;
          const x = position.x;
          const y = position.y;

          // Sync button position with physics body
          buttonRef.current.style.transform = `
            translate(
              calc(-50% + ${x}px),
              calc(-50% + ${y}px)
            )
            rotate(${angle}rad)
          `;

          // Check if button has landed (velocity near zero at bottom)
          const velocity = bodyRef.current.velocity;
          const hasStoppedMoving =
            Math.abs(velocity.y) < 0.5 &&
            Math.abs(velocity.x) < 0.5 &&
            y > viewportHeight - 50;

          if (hasStoppedMoving && !isLanded) {
            isLanded = true;
            hasLandedRef.current = true;
            onLand?.();
          }

          animationIdRef.current = requestAnimationFrame(animate);
        };

        animationIdRef.current = requestAnimationFrame(animate);
        console.log('Physics animation started');
      })
      .catch((error) => {
        console.error('Failed to load Matter.js:', error);
      });

    // Cleanup function
    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }

      if (engineRef.current && Matter) {
        Matter.World.clear(engineRef.current.world, false);
        Matter.Engine.clear(engineRef.current);
        engineRef.current = null;
      }

      bodyRef.current = null;
      hasLandedRef.current = false;
    };
  }, [isActive, buttonRef, onLand]);

  const reset = () => {
    hasLandedRef.current = false;

    // Reset button DOM styles
    if (buttonRef.current) {
      buttonRef.current.style.position = '';
      buttonRef.current.style.zIndex = '';
      buttonRef.current.style.transform = '';
      buttonRef.current.style.left = '';
      buttonRef.current.style.top = '';
    }

    // Clean up physics engine
    if (engineRef.current && Matter) {
      Matter.World.clear(engineRef.current.world, false);
      Matter.Engine.clear(engineRef.current);
      engineRef.current = null;
    }

    if (bodyRef.current) {
      bodyRef.current = null;
    }

    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  };

  return { reset };
};
