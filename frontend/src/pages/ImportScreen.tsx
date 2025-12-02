
import { useState } from 'react';
import { 
  Container, 
  Title, 
  TextInput, 
  Button, 
  Paper, 
  Stack, 
  Text, 
  Group, 
  Notification,
  Alert,
  SimpleGrid,
  Image,
  Progress,
  Tabs,
  rem
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from '@mantine/dropzone';
import { 
  IconFolderSearch, 
  IconBrain, 
  IconCheck, 
  IconAlertCircle,
  IconInfoCircle,
  IconUpload,
  IconPhoto,
  IconX
} from '@tabler/icons-react';
import { api } from '../api/client';

export function ImportScreen() {
  const [activeTab, setActiveTab] = useState<string | null>('upload');

  // --- Scan State ---
  const [path, setPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  
  // --- AI State ---
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  // --- Upload State ---
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- Notifications ---
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // 1. Handle Server-Side Scan
  const handleScan = async () => {
    if (!path) return;
    setIsScanning(true);
    setNotification(null);

    try {
      const response = await api.post('/scan/', { path }, {
        headers: { 'Content-Type': 'application/json' }
      });
      setNotification({ type: 'success', message: response.data.message });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.detail || 'Failed to start scan.' });
    } finally {
      setIsScanning(false);
    }
  };

  // 2. Handle AI Trigger
  const handleAIProcess = async () => {
    setIsProcessingAI(true);
    setNotification(null);

    try {
      const response = await api.post('/ai/process');
      setNotification({ type: 'success', message: response.data.message });
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to start AI processing.' });
    } finally {
      setIsProcessingAI(false);
    }
  };

  // 3. Handle Browser Upload
  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);
    setNotification(null);

    const formData = new FormData();
    files.forEach((file) => {
        formData.append('files', file);
    });

    try {
        const response = await api.post('/upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                setUploadProgress(percentCompleted);
            }
        });
        
        setNotification({ 
            type: 'success', 
            message: `Successfully processed ${response.data.uploaded} images.` 
        });
        setFiles([]); // Clear queue
        setUploadProgress(0);

    } catch (err: any) {
        setNotification({ type: 'error', message: 'Upload failed. Check server logs.' });
    } finally {
        setIsUploading(false);
    }
  };

  const previews = files.map((file, index) => {
    const imageUrl = URL.createObjectURL(file);
    return (
      <Image
        key={index}
        src={imageUrl}
        h={80}
        w="auto"
        radius="md"
        onLoad={() => URL.revokeObjectURL(imageUrl)}
      />
    );
  });

  return (
    <Container size="md">
      <Stack gap="xl">
        <Title order={2}>Import & Management</Title>

        {notification && (
          <Notification 
            icon={notification.type === 'success' ? <IconCheck size="1.1rem" /> : <IconAlertCircle size="1.1rem" />}
            color={notification.type === 'success' ? 'teal' : 'red'}
            title={notification.type === 'success' ? 'Task Info' : 'Error'}
            onClose={() => setNotification(null)}
          >
            {notification.message}
          </Notification>
        )}

        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
            <Tabs.List>
                <Tabs.Tab value="upload" leftSection={<IconUpload size={14} />}>
                    Web Upload
                </Tabs.Tab>
                <Tabs.Tab value="scan" leftSection={<IconFolderSearch size={14} />}>
                    Server Scan
                </Tabs.Tab>
                <Tabs.Tab value="ai" leftSection={<IconBrain size={14} />}>
                    AI Tools
                </Tabs.Tab>
            </Tabs.List>

            {/* TAB: Web Upload */}
            <Tabs.Panel value="upload" pt="xs">
                <Paper withBorder p="md" radius="md">
                    <Stack>
                        <Dropzone
                            onDrop={setFiles}
                            onReject={(files) => console.log('rejected files', files)}
                            maxSize={100 * 1024 ** 2} // Increased to 100MB for ZIPs
                            accept={[...IMAGE_MIME_TYPE, 'application/zip', 'application/x-zip-compressed']}
                            loading={isUploading}
                        >
                            <Group justify="center" gap="xl" style={{ minHeight: rem(120), pointerEvents: 'none' }}>
                                <Dropzone.Accept>
                                    <IconUpload size="3.2rem" stroke={1.5} color="var(--mantine-color-blue-6)" />
                                </Dropzone.Accept>
                                <Dropzone.Reject>
                                    <IconX size="3.2rem" stroke={1.5} color="var(--mantine-color-red-6)" />
                                </Dropzone.Reject>
                                <Dropzone.Idle>
                                    <IconPhoto size="3.2rem" stroke={1.5} />
                                </Dropzone.Idle>

                                <div>
                                    <Text size="xl" inline>
                                        Drag images or ZIP files here
                                    </Text>
                                    <Text size="sm" c="dimmed" inline mt={7}>
                                        Attach images or a ZIP archive (max 100MB).
                                        ZIP contents will be extracted and converted to WebP.
                                    </Text>
                                </div>
                            </Group>
                        </Dropzone>

                        {files.length > 0 && (
                            <>
                                <Text size="sm" fw={500}>Selected files ({files.length}):</Text>
                                <SimpleGrid cols={{ base: 4, sm: 6, md: 8 }}>
                                    {previews}
                                </SimpleGrid>
                                
                                {isUploading && <Progress value={uploadProgress} animated />}

                                <Button onClick={handleUpload} loading={isUploading}>
                                    Upload & Process
                                </Button>
                            </>
                        )}
                    </Stack>
                </Paper>
            </Tabs.Panel>

            {/* TAB: Server Scan */}
            <Tabs.Panel value="scan" pt="xs">
                <Paper withBorder p="md" radius="md">
                    <Stack gap="sm">
                        <TextInput 
                          label="Absolute Server Directory Path"
                          placeholder="/home/user/images/race-day-1"
                          description="Useful for importing existing large archives on the server disk."
                          value={path}
                          onChange={(e) => setPath(e.currentTarget.value)}
                        />
                        <Button onClick={handleScan} loading={isScanning} disabled={!path}>
                          Start Scan
                        </Button>
                    </Stack>
                </Paper>
            </Tabs.Panel>

            {/* TAB: AI Tools */}
            <Tabs.Panel value="ai" pt="xs">
                <Paper withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Alert icon={<IconInfoCircle size={16} />} title="About AI Processing" color="blue">
                        The AI worker analyzes all images that haven't been tagged yet. 
                        It uses CLIP for object detection and OCR for reading text/numbers.
                    </Alert>

                    <Button 
                      variant="light" 
                      color="grape" 
                      onClick={handleAIProcess} 
                      loading={isProcessingAI}
                    >
                      Run AI Analysis on Pending Images
                    </Button>
                  </Stack>
                </Paper>
            </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}