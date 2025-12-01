import { useState } from 'react';
import { Title, Text, Container, TextInput, Button, Paper, Stack, List, ThemeIcon, Tabs, Group, RingProgress } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconFolder, IconSearch, IconCheck, IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../api/client';

const ImportPage = () => {
  const [activeTab, setActiveTab] = useState<string | null>('upload');
  
  // Server Scan State
  const [path, setPath] = useState('');
  const [isScanLoading, setIsScanLoading] = useState(false);

  // Upload State
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- Handlers ---

  const handleServerScan = async () => {
    if (!path) {
        notifications.show({ title: 'Error', message: 'Please enter a valid path.', color: 'red' });
        return;
    }

    setIsScanLoading(true);
    try {
        await api.post('/scan/', { path });
        notifications.show({ title: 'Scan Started', message: 'Processing in background.', color: 'green' });
        setPath('');
    } catch (error: any) {
        notifications.show({ title: 'Failed', message: error.response?.data?.detail || 'Error', color: 'red' });
    } finally {
        setIsScanLoading(false);
    }
  };

  const handleBrowserUpload = async () => {
      if (files.length === 0) return;
      
      setIsUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      files.forEach(file => {
          formData.append('files', file);
      });
      
      try {
          // Use axios config for progress
          await api.post('/upload/batch', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              onUploadProgress: (progressEvent) => {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                  setUploadProgress(percentCompleted);
              }
          });
          
          notifications.show({ title: 'Upload Complete', message: `${files.length} files uploaded and queued.`, color: 'green' });
          setFiles([]);
          setUploadProgress(0);
          
      } catch (error) {
          notifications.show({ title: 'Upload Failed', message: 'Server error.', color: 'red' });
      } finally {
          setIsUploading(false);
      }
  };

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="md">Import & Ingest</Title>

      <Tabs value={activeTab} onChange={setActiveTab} radius="md" mb="xl">
        <Tabs.List>
            <Tabs.Tab value="upload" leftSection={<IconUpload size={16} />}>Browser Upload</Tabs.Tab>
            <Tabs.Tab value="server" leftSection={<IconFolder size={16} />}>Server Path</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="upload" pt="xl">
            <Paper withBorder p="xl" radius="md">
                <Stack>
                    <Text fw={500}>Upload Photos or ZIPs</Text>
                    <Text size="sm" c="dimmed">Drag & drop images or ZIP archives here. They will be uploaded to the server and processed automatically.</Text>
                    
                    <Dropzone
                        onDrop={setFiles}
                        onReject={(_) => notifications.show({ title: 'Rejected', message: 'File too large or invalid type', color: 'red' })}
                        maxSize={500 * 1024 * 1024} // 500 MB
                        accept={[...IMAGE_MIME_TYPE, 'application/zip', 'application/x-zip-compressed']}
                        loading={isUploading}
                    >
                        <Group justify="center" gap="xl" style={{ minHeight: 120, pointerEvents: 'none' }}>
                            <Dropzone.Accept>
                                <IconUpload size={50} stroke={1.5} color="blue" />
                            </Dropzone.Accept>
                            <Dropzone.Reject>
                                <IconX size={50} stroke={1.5} color="red" />
                            </Dropzone.Reject>
                            <Dropzone.Idle>
                                <IconPhoto size={50} stroke={1.5} color="gray" />
                            </Dropzone.Idle>

                            <div>
                            <Text size="xl" inline>
                                Drag images here or click to select files
                            </Text>
                            <Text size="sm" c="dimmed" inline mt={7}>
                                Attach as many files as you like. ZIP archives are supported.
                            </Text>
                            </div>
                        </Group>
                    </Dropzone>
                    
                    {/* File Preview List (Simple) */}
                    {files.length > 0 && (
                        <Stack gap="xs">
                            <Text size="sm" fw={700}>{files.length} files selected:</Text>
                            {files.slice(0, 5).map((f, i) => (
                                <Text key={i} size="xs" c="dimmed">{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</Text>
                            ))}
                            {files.length > 5 && <Text size="xs" c="dimmed">...and {files.length - 5} more</Text>}
                            
                            {isUploading && (
                                <Group>
                                    <RingProgress 
                                        size={40} 
                                        thickness={4} 
                                        sections={[{ value: uploadProgress, color: 'blue' }]} 
                                    />
                                    <Text size="sm">Uploading: {uploadProgress}%</Text>
                                </Group>
                            )}
                            
                            <Group mt="md">
                                <Button onClick={handleBrowserUpload} loading={isUploading}>Start Upload</Button>
                                <Button variant="default" onClick={() => setFiles([])} disabled={isUploading}>Clear</Button>
                            </Group>
                        </Stack>
                    )}
                </Stack>
            </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="server" pt="xl">
            <Paper withBorder p="xl" radius="md">
                <Stack gap="md">
                    <Text fw={500}>Select Local Directory</Text>
                    <Text size="sm" c="dimmed">
                        Enter the absolute path to the folder on the server.
                        Useful for large existing archives (10GB+).
                    </Text>
                    
                    <TextInput 
                        placeholder="/home/user/photos/Brno_2024" 
                        leftSection={<IconFolder size={16} />}
                        value={path}
                        onChange={(e) => setPath(e.currentTarget.value)}
                    />
                    
                    <Button 
                        onClick={handleServerScan} 
                        loading={isScanLoading}
                        leftSection={<IconSearch size={18} />}
                    >
                        Start Ingestion Process
                    </Button>
                </Stack>
            </Paper>
        </Tabs.Panel>
      </Tabs>
      
       <Title order={4} mb="sm" mt="xl">How it works</Title>
          <List spacing="sm" size="sm" center icon={
            <ThemeIcon color="blue" size={24} radius="xl">
              <IconCheck size={14} />
            </ThemeIcon>
          }>
            <List.Item>Recursive scanning of all subfolders.</List.Item>
            <List.Item>Automatic extraction of <b>.zip</b> files.</List.Item>
            <List.Item>Duplicate detection via SHA-256 hash.</List.Item>
            <List.Item>Background AI analysis (queued automatically).</List.Item>
          </List>
    </Container>
  );
};

export default ImportPage;