'use client';

import { useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type SpotlightCardProps = {
  title: string;
  description: string;
  value: number;
};

const SpotlightCard = ({ title, description, value }: SpotlightCardProps) => {
  useEffect(() => {
    const all = document.querySelectorAll('.spotlight-card');

    const handleMouseMove = (ev: MouseEvent) => {
      all.forEach((e) => {
        const blob = e.querySelector('.blob') as HTMLElement;
        const fblob = e.querySelector('.fake-blob') as HTMLElement;
        if (!blob || !fblob) return;

        const rec = fblob.getBoundingClientRect();
        blob.style.opacity = '1';

        blob.animate(
          [
            {
              transform: `translate(${
                ev.clientX - rec.left - rec.width / 2
              }px, ${ev.clientY - rec.top - rec.height / 2}px)`,
            },
          ],
          {
            duration: 300,
            fill: 'forwards',
          }
        );
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="spotlight-card group bg-border relative overflow-hidden rounded-xl p-px transition-all duration-300 ease-in-out">
      <Card className="group-hover:bg-card/90 border-none transition-all duration-300 ease-in-out group-hover:backdrop-blur-[20px]">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">
            {value.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <div className="blob bg-primary/60 absolute top-0 left-0 h-20 w-20 rounded-full opacity-0 blur-2xl transition-all duration-300 ease-in-out" />
      <div className="fake-blob absolute top-0 left-0 h-20 w-20 rounded-full" />
    </div>
  );
};

export default SpotlightCard;
