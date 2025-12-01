import { useEffect, useState } from 'react';
import { Title, Text, Container, Paper, Stack, Group, Avatar, Button, Divider, Switch, TextInput, Textarea, Slider, ThemeIcon, Loader, Alert } from '@mantine/core';
import { IconUser, IconDeviceFloppy, IconCpu, IconInfoCircle } from '@tabler/icons-react';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { notifications } from '@mantine/notifications';

const SettingsPage = () => {
  const { user } = useAuthStore();
  
  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await api.get('/manage/config');
      return res.data;
    }
  });

  const [domain, setDomain] = useState('');
  const [labels, setLabels] = useState('');
  const [threshold, setThreshold] = useState(0.65);
  const [ocrEnabled, setOcrEnabled] = useState(true);

  useEffect(() => {
    if (config) {
        setDomain(config.domain || 'racing');
        setLabels(config.clip?.labels?.join('\n') || '');
        setThreshold(config.clip?.confidence_threshold || 0.65);
        setOcrEnabled(config.ocr?.enabled ?? true);
    }
  }, [config]);

  const saveMutation = useMutation({
      mutationFn: async () => {
          const newConfig = {
              ...config,
              domain: domain,
              clip: {
                  ...config?.clip,
                  confidence_threshold: threshold,
                  labels: labels.split('\n').filter(l => l.trim().length > 0)
              },
              ocr: {
                  ...config?.ocr,
                  enabled: ocrEnabled
              }
          };
          
          await api.post('/manage/config', newConfig);
      },
      onSuccess: () => {
          notifications.show({ title: 'Saved', message: 'Configuration updated successfully.', color: 'green' });
          refetch();
      },
      onError: () => {
          notifications.show({ title: 'Error', message: 'Failed to save configuration.', color: 'red' });
      }
  });

  if (isLoading) return <Container mt="xl"><Loader /></Container>;

  return (
    <Container size="md" pb="xl">
      <Title order={2} mb="xl">Settings</Title>

      <Stack gap="xl">
        <Paper withBorder p="xl" radius="md">
            <Group mb="md" justify="space-between">
                <Group>
                    <ThemeIcon color="orange" variant="light" size="lg">
                        <IconCpu size={20} />
                    </ThemeIcon>
                    <Title order={4}>AI Model Configuration</Title>
                </Group>
                <Button 
                    leftSection={<IconDeviceFloppy size={18} />} 
                    onClick={() => saveMutation.mutate()}
                    loading={saveMutation.isPending}
                >
                    Save Changes
                </Button>
            </Group>
            
            <Alert icon={<IconInfoCircle size={16} />} title="Configuration Info" color="blue" mb="md">
                Updating labels applies immediately to new imports. Changing the model architecture requires a server restart.
            </Alert>
            
            <Stack gap="md">
                <TextInput 
                    label="Project Domain" 
                    description="Used for internal categorization."
                    value={domain}
                    onChange={(e) => setDomain(e.currentTarget.value)}
                />
                
                <Textarea
                    label="Recognition Labels (One per line)"
                    description="The AI will search for these concepts in every image."
                    minRows={6}
                    autosize
                    value={labels}
                    onChange={(e) => setLabels(e.currentTarget.value)}
                />
                
                <Stack gap={0}>
                    <Text size="sm" fw={500} mb={5}>Confidence Threshold: {(threshold * 100).toFixed(0)}%</Text>
                    <Text size="xs" c="dimmed" mb="sm">
                        Minimum certainty required to auto-tag an image. Lowering this increases recall but adds noise.
                    </Text>
                    <Slider 
                        value={threshold} 
                        onChange={setThreshold} 
                        min={0.1} 
                        max={0.95} 
                        step={0.05}
                        marks={[
                            { value: 0.2, label: 'Loose' },
                            { value: 0.5, label: 'Balanced' },
                            { value: 0.8, label: 'Strict' },
                        ]}
                        mb="lg"
                    />
                </Stack>

                <Switch 
                    label="Enable OCR (Text Recognition)" 
                    description="Detect race numbers and text on vehicles." 
                    checked={ocrEnabled}
                    onChange={(e) => setOcrEnabled(e.currentTarget.checked)}
                />
            </Stack>
        </Paper>

        <Paper withBorder p="xl" radius="md">
            <Group mb="lg">
                <Avatar size="xl" radius="xl" color="blue">
                    <IconUser size={40} />
                </Avatar>
                <div>
                    <Title order={3}>{user?.full_name || 'User'}</Title>
                    <Text c="dimmed">{user?.email}</Text>
                </div>
            </Group>
            <Divider mb="md" label="Profile Management" labelPosition="center" />
            <Text size="sm" c="dimmed" ta="center">
                Profile editing is managed by the system administrator.
            </Text>
        </Paper>
      </Stack>
    </Container>
  );
};

export default SettingsPage;