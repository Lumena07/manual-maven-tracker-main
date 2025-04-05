import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  FilePlus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  UserCheck,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ManualRow, AmendmentRow, FinalRevision } from '@/types/database';
import { ManualList } from '@/components/manual/ManualList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AmendmentsTable } from '@/components/amendment/AmendmentsTable';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: manuals, isLoading: manualsLoading } = useQuery({
    queryKey: ['manuals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manuals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(item => ({
        ...item,
        is_obsolete: false
      })) as ManualRow[];
    }
  });

  const { data: pendingAmendments, isLoading: amendmentsLoading } = useQuery({
    queryKey: ['pendingAmendments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('amendments')
        .select('*')
        .eq('status', 'pending');
      
      if (error) throw error;
      return data as AmendmentRow[];
    }
  });

  const { data: approvedThisMonth, isLoading: approvedLoading } = useQuery({
    queryKey: ['approvedThisMonth'],
    queryFn: async () => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { data, error } = await supabase
        .from('amendments')
        .select('*')
        .eq('status', 'approved')
        .gte('approved_by_authority_at', firstDayOfMonth);
      
      if (error) throw error;
      return data as AmendmentRow[];
    }
  });

  const { data: latestRevisions, isLoading: revisionsLoading } = useQuery({
    queryKey: ['latestRevisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('final_revisions')
        .select('*')
        .order('revision_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as FinalRevision[];
    }
  });

  const { data: recentActivityData, isLoading: activityLoading } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('amendments')
        .select(`
          id,
          title,
          status,
          created_at,
          manual_id,
          manuals (title)
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    }
  });
  
  // Format recent activity data
  const recentActivity = recentActivityData?.map(item => {
    const createdAt = new Date(item.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let timeString;
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        timeString = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      } else {
        timeString = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      }
    } else if (diffDays === 1) {
      timeString = "Yesterday";
    } else {
      timeString = `${diffDays} days ago`;
    }
    
    return { 
      title: item.title, 
      description: `Amendment for ${item.manuals?.title || 'Manual'}`, 
      time: timeString,
      status: item.status as 'quality' | 'approved' | 'pending' | 'rejected'
    };
  }) || [];

  const statistics = [
    { 
      title: "Active Manuals", 
      value: manualsLoading ? "..." : manuals?.filter(m => !m.is_obsolete).length.toString() || "0", 
      icon: FileText, 
      color: "bg-blue-500" 
    },
    { 
      title: "Pending Amendments", 
      value: amendmentsLoading ? "..." : pendingAmendments?.length.toString() || "0", 
      icon: AlertCircle, 
      color: "bg-amber-500" 
    },
    { 
      title: "Approved This Month", 
      value: approvedLoading ? "..." : approvedThisMonth?.length.toString() || "0", 
      icon: CheckCircle, 
      color: "bg-emerald-500" 
    },
    { 
      title: "Latest Revisions", 
      value: revisionsLoading ? "..." : latestRevisions?.length.toString() || "0", 
      icon: Clock, 
      color: "bg-purple-500" 
    },
  ];
  
  return (
    <Layout>
      <div className="space-y-6 py-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <p className="text-gray-500 mt-1">Overview of your manual management system</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/manual/new')}
              className="gap-2"
            >
              <FilePlus className="h-4 w-4" />
              Upload Manual
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="amendments">Amendments</TabsTrigger>
            <TabsTrigger value="manuals">Manuals</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {statistics.map((stat, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
                      <div className={`${stat.color} p-2 rounded-md`}>
                        <stat.icon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest updates and amendments to your manuals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activityLoading ? (
                      <p className="text-gray-500">Loading recent activity...</p>
                    ) : recentActivity.length > 0 ? (
                      recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className={`mt-0.5 p-2 rounded-full ${
                            activity.status === 'approved' ? 'bg-emerald-100' : 
                            activity.status === 'quality' ? 'bg-amber-100' : 
                            activity.status === 'rejected' ? 'bg-red-100' :
                            'bg-gray-100'
                          }`}>
                            {activity.status === 'approved' ? 
                              <CheckCircle className="h-4 w-4 text-emerald-600" /> : 
                              activity.status === 'quality' ? 
                              <UserCheck className="h-4 w-4 text-amber-600" /> : 
                              activity.status === 'rejected' ?
                              <AlertCircle className="h-4 w-4 text-red-600" /> :
                              <Clock className="h-4 w-4 text-gray-600" />
                            }
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{activity.title}</h4>
                                <p className="text-sm text-gray-500">{activity.description}</p>
                              </div>
                              <span className="text-xs text-gray-400">{activity.time}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No recent activity</p>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      className="w-full text-gray-500 hover:text-gray-800 mt-2"
                      onClick={() => navigate('/activity')}
                    >
                      View All Activity
                      <ArrowUpRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks and shortcuts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => navigate('/manual/new')}
                  >
                    Upload New Manual
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => navigate('/amendments/pending')}
                  >
                    Review Pending Amendments
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => navigate('/revisions')}
                  >
                    View Revision History
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                    onClick={() => navigate('/users')}
                  >
                    Manage Users
                    <UserCheck className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="amendments">
            <Card>
              <CardHeader>
                <CardTitle>Amendments</CardTitle>
                <CardDescription>
                  Manage and review amendments to your manuals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AmendmentsTable />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="manuals">
            <ManualList manuals={manuals || []} isLoading={manualsLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;
