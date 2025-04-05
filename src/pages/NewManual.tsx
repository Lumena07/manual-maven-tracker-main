import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ManualUploader } from '@/components/manual/ManualUploader';
import { ManualImporter } from '@/components/manual/ManualImporter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Upload, Link } from 'lucide-react';

const NewManual = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <Layout>
      <div className="py-6 animate-fade-in">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2" 
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl font-semibold">Add New Manual</h1>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Tabs 
            defaultValue="upload" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="mb-6"
          >
            <div className="flex justify-center mb-6">
              <TabsList>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Import URL
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="upload">
              <ManualUploader />
            </TabsContent>
            
            <TabsContent value="import">
              <ManualImporter />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default NewManual;
