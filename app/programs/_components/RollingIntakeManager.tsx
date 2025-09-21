'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, ArrowRight, RotateCcw, Play } from 'lucide-react';
import { format, addDays, addWeeks } from 'date-fns';

interface RollingSchedule {
  id: string;
  name: string;
  programId: string;
  cycleType: 'daily' | 'weekly' | 'monthly';
  cycleDuration: number;
  unitDuration: number; // in days
  totalUnits: number;
  isActive: boolean;
  startDate: Date;
  currentCycle: number;
  nextStartDate: Date;
}

interface UnitSchedule {
  unitId: string;
  unitName: string;
  sequence: number;
  startDay: number;
  endDay: number;
  isCore: boolean;
  prerequisites: string[];
}

interface CatchUpPlan {
  studentId: string;
  currentUnit: number;
  missedUnits: number[];
  catchUpSchedule: {
    unit: number;
    startDate: Date;
    endDate: Date;
  }[];
}

interface RollingIntakeManagerProps {
  programId: string;
  programName: string;
  units: UnitSchedule[];
}

export const RollingIntakeManager = ({ programId, programName, units }: RollingIntakeManagerProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [schedules] = useState<RollingSchedule[]>([
    {
      id: '1',
      name: 'Standard Rolling Schedule',
      programId,
      cycleType: 'weekly',
      cycleDuration: 12, // 12 weeks per cycle
      unitDuration: 7, // 1 week per unit
      totalUnits: units.length,
      isActive: true,
      startDate: new Date('2025-01-15'),
      currentCycle: 3,
      nextStartDate: new Date('2025-04-09'),
    }
  ]);

  const [catchUpPlans] = useState<CatchUpPlan[]>([
    {
      studentId: 'stu-001',
      currentUnit: 5,
      missedUnits: [1, 2, 3, 4],
      catchUpSchedule: [
        { unit: 1, startDate: new Date('2025-05-01'), endDate: new Date('2025-05-07') },
        { unit: 2, startDate: new Date('2025-05-08'), endDate: new Date('2025-05-14') },
        { unit: 3, startDate: new Date('2025-05-15'), endDate: new Date('2025-05-21') },
        { unit: 4, startDate: new Date('2025-05-22'), endDate: new Date('2025-05-28') },
      ]
    }
  ]);

  const calculateUnitSchedule = (schedule: RollingSchedule, unitSequence: number) => {
    const cycleStart = schedule.startDate;
    const unitStartDay = (unitSequence - 1) * schedule.unitDuration;
    const unitEndDay = unitStartDay + schedule.unitDuration - 1;
    
    return {
      startDay: unitStartDay,
      endDay: unitEndDay,
      startDate: addDays(cycleStart, unitStartDay),
      endDate: addDays(cycleStart, unitEndDay),
    };
  };

  const generateRollingSchedule = (schedule: RollingSchedule) => {
    const cycles = [];
    for (let cycle = 1; cycle <= 4; cycle++) {
      const cycleStart = addWeeks(schedule.startDate, (cycle - 1) * schedule.cycleDuration);
      const cycleUnits = units.map((unit) => {
        const unitSchedule = calculateUnitSchedule({ ...schedule, startDate: cycleStart }, unit.sequence);
        return {
          ...unit,
          ...unitSchedule,
          cycle,
        };
      });
      cycles.push({
        cycle,
        startDate: cycleStart,
        endDate: addDays(cycleStart, schedule.cycleDuration * 7 - 1),
        units: cycleUnits,
      });
    }
    return cycles;
  };


  const generateCatchUpSchedule = (catchUpPlan: CatchUpPlan) => {
    const schedule = [];
    const currentDate = new Date();
    
    catchUpPlan.catchUpSchedule.forEach((item) => {
      schedule.push({
        unit: item.unit,
        unitName: units.find(u => u.sequence === item.unit)?.unitName || `Unit ${item.unit}`,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.startDate <= currentDate ? 'in-progress' : 'pending',
      });
    });
    
    return schedule;
  };

  const rollingSchedules = schedules.map(schedule => generateRollingSchedule(schedule));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rolling Intake Manager</h2>
          <p className="text-muted-foreground">Advanced scheduling and catch-up management for {programName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Cycle
          </Button>
          <Button size="sm">
            <Play className="h-4 w-4 mr-2" />
            Start New Cycle
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Rolling Schedule</TabsTrigger>
          <TabsTrigger value="catchup">Catch-up Plans</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{schedule.name}</CardTitle>
                    <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                      {schedule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription>
                    {schedule.cycleType} cycle • {schedule.cycleDuration} weeks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Current Cycle: {schedule.currentCycle}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Next Start: {format(schedule.nextStartDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{units.length} units • {schedule.unitDuration} days each</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rolling Intake Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">12</div>
                  <div className="text-sm text-muted-foreground">Active Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">3</div>
                  <div className="text-sm text-muted-foreground">Current Cycle</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">5</div>
                  <div className="text-sm text-muted-foreground">Catch-up Plans</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">85%</div>
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rolling Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          {rollingSchedules.map((scheduleData, scheduleIndex) => (
            <Card key={scheduleIndex}>
              <CardHeader>
                <CardTitle>{schedules[scheduleIndex].name}</CardTitle>
                <CardDescription>
                  Rolling schedule showing 4 cycles with cyclical catch-up logic
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {scheduleData.map((cycle) => (
                    <div key={cycle.cycle} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">Cycle {cycle.cycle}</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(cycle.startDate, 'MMM dd')} - {format(cycle.endDate, 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <Badge variant={cycle.cycle === schedules[scheduleIndex].currentCycle ? 'default' : 'secondary'}>
                          {cycle.cycle === schedules[scheduleIndex].currentCycle ? 'Current' : 'Future'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cycle.units.map((unit) => (
                          <div key={unit.sequence} className="border rounded p-3 bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">Unit {unit.sequence}</span>
                              <Badge variant={unit.isCore ? 'default' : 'outline'} className="text-xs">
                                {unit.isCore ? 'Core' : 'Elective'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{unit.unitName}</p>
                            <div className="text-xs text-muted-foreground">
                              {format(unit.startDate, 'MMM dd')} - {format(unit.endDate, 'MMM dd')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Catch-up Plans Tab */}
        <TabsContent value="catchup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Catch-up Management</CardTitle>
              <CardDescription>
                Manage students who started mid-cycle and need to complete missed units
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {catchUpPlans.map((plan) => {
                  const catchUpSchedule = generateCatchUpSchedule(plan);
                  return (
                    <div key={plan.studentId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">Student {plan.studentId}</h3>
                          <p className="text-sm text-muted-foreground">
                            Currently on Unit {plan.currentUnit} • {plan.missedUnits.length} units to catch up
                          </p>
                        </div>
                        <Badge variant="outline">
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Catch-up Active
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Catch-up Schedule</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {catchUpSchedule.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-3 border rounded bg-muted/30">
                                <div>
                                  <div className="font-medium text-sm">{item.unitName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(item.startDate, 'MMM dd')} - {format(item.endDate, 'MMM dd')}
                                  </div>
                                </div>
                                <Badge variant={item.status === 'in-progress' ? 'default' : 'secondary'}>
                                  {item.status === 'in-progress' ? 'In Progress' : 'Pending'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cycle Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Cycle 1</span>
                    <span className="text-sm font-medium">92% completion</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cycle 2</span>
                    <span className="text-sm font-medium">88% completion</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cycle 3</span>
                    <span className="text-sm font-medium">85% completion</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Catch-up Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Successful Catch-ups</span>
                    <span className="text-sm font-medium text-green-600">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Average Catch-up Time</span>
                    <span className="text-sm font-medium">3.2 weeks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Students Needing Support</span>
                    <span className="text-sm font-medium text-orange-600">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
