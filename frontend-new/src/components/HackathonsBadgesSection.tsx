'use client';

import HackathonList from './HackathonList';
import BadgeDisplay from './BadgeDisplay';

interface Hackathon {
  _id: string;
  title: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  teamSize?: number;
  teams?: Array<{
    members: Array<{ _id: string }>;
    repoUrl?: string;
  }>;
}

interface Badge {
  _id: string;
  name: string;
  description: string;
  icon?: string;
}

interface User {
  _id: string;
  role: string;
}

interface HackathonsBadgesSectionProps {
  hackathons: Hackathon[];
  badges: Badge[];
  user: User | null;
  onShowSubmitHackathonModal: (hackathon: Hackathon, team: any) => void;
}

export default function HackathonsBadgesSection({ 
  hackathons, 
  badges, 
  user, 
  onShowSubmitHackathonModal 
}: HackathonsBadgesSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <HackathonList 
        hackathons={hackathons} 
        user={user} 
        onShowSubmitHackathonModal={onShowSubmitHackathonModal}
      />
      <BadgeDisplay badges={badges} />
    </div>
  );
}
