import { Title, Text, Container, SimpleGrid, Paper, Group, Stack, Button, Skeleton, Progress, Center, ThemeIcon } from '@mantine/core';
import { IconPhoto, IconFolders, IconTags, IconCpu, IconDatabase } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, DonutChart } from '@mantine/charts';
import { api } from '../api/client';

const DashboardPage = () => {
  const navigate = useNavigate();

  // --- Fetch Real Stats ---
  const { data: serverStats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/manage/stats');
      return res.data;
    }
  });

  const stats = [
    { label: 'Total Photos', value: serverStats?.total_images?.toLocaleString() || '0', icon: IconPhoto, color: 'blue' },
    { label: 'Albums', value: serverStats?.total_albums?.toLocaleString() || '0', icon: IconFolders, color: 'cyan' },
    { label: 'Unique Tags', value: serverStats?.total_tags?.toLocaleString() || '0', icon: IconTags, color: 'teal' },
    { label: 'Pending AI', value: serverStats?.pending_ai?.toLocaleString() || '0', icon: IconCpu, color: 'orange' },
  ];

  const StatCard = ({ stat, loading }: { stat: typeof stats[0], loading: boolean }) => (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} size="xs">
            {stat.label}
          </Text>
          {loading ? (
              <Skeleton height={25} width={60} mt={5} />
          ) : (
              <Text fw={700} size="xl">
                {stat.value}
              </Text>
          )}
        </div>
        <ThemeIcon color={stat.color} variant="light" size={38} radius="md">
          <stat.icon size="1.8rem" stroke={1.5} />
        </ThemeIcon>
      </Group>
    </Paper>
  );

  return (
    <Container fluid p={0}>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Analytics Overview</Title>
          <Text c="dimmed" size="sm">Real-time insights into your gallery.</Text>
        </div>
        <Button onClick={() => navigate('/import')} leftSection={<IconCpu size={18} />}>
            Trigger New Scan
        </Button>
      </Group>

      {/* Stats Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} loading={isLoading} />
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="xl">
        
        {/* Upload Traffic Chart */}
        <Paper withBorder p="md" radius="md">
          <Title order={4} mb="md">Upload Traffic</Title>
          {isLoading ? <Skeleton height={300} /> : (
            serverStats?.history && serverStats.history.length > 0 ? (
                <AreaChart
                    h={300}
                    data={serverStats.history}
                    dataKey="date"
                    series={[{ name: 'count', color: 'blue.6', label: 'Uploads' }]}
                    curveType="linear"
                    tickLine="none"
                    gridAxis="xy"
                    withGradient
                />
            ) : (
                <Center h={300}>
                    <Text c="dimmed">No upload history yet.</Text>
                </Center>
            )
          )}
        </Paper>

        {/* Top Tags & Storage */}
        <Stack gap="lg">
            {/* Top Tags Donut */}
            <Paper withBorder p="md" radius="md" style={{ flex: 1 }}>
                <Title order={4} mb="md">Top AI Tags</Title>
                 {isLoading ? <Skeleton height={200} /> : (
                    serverStats?.top_tags && serverStats.top_tags.length > 0 ? (
                        <Group justify="center" gap="xl" align="center" style={{ height: '100%' }}>
                            <DonutChart 
                                data={serverStats.top_tags} 
                                size={180} 
                                thickness={20}
                                withLabelsLine
                                withLabels
                                tooltipDataSource="segment"
                            />
                        </Group>
                    ) : (
                        <Center h={180}>
                            <Text c="dimmed">No tags generated yet.</Text>
                        </Center>
                    )
                 )}
            </Paper>

            {/* Real Storage Usage */}
            <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                        <IconDatabase size={18} color="gray" />
                        <Title order={5}>App Storage</Title>
                    </Group>
                    <Text fw={700} size="sm">{serverStats?.storage?.formatted || '0 MB'}</Text>
                </Group>
                <Progress.Root size="xl" radius="xl">
                    <Progress.Section value={100} color="blue" striped animated={isLoading}>
                        <Progress.Label>App Data</Progress.Label>
                    </Progress.Section>
                </Progress.Root>
                <Text size="xs" c="dimmed" mt="xs">
                    Only counts application data (uploads, thumbnails, database).
                </Text>
            </Paper>
        </Stack>
      </SimpleGrid>
    </Container>
  );
};

export default DashboardPage;
