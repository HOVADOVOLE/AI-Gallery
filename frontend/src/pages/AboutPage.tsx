import { useQuery } from '@tanstack/react-query';
import { Container, Paper, TypographyStylesProvider, Loader, Center, Alert } from '@mantine/core';
import Markdown from 'react-markdown';
import { api } from '../api/client';
import { IconInfoCircle } from '@tabler/icons-react';

const AboutPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['readme'],
    queryFn: async () => {
      const res = await api.get('/manage/readme');
      return res.data;
    }
  });

  if (isLoading) return <Center h="50vh"><Loader /></Center>;
  
  if (isError) return (
      <Container mt="xl">
        <Alert icon={<IconInfoCircle />} title="Error" color="red">
            Could not load documentation.
        </Alert>
      </Container>
  );

  return (
    <Container size="lg" py="xl">
        <Paper withBorder p="xl" radius="md">
            <TypographyStylesProvider>
                <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
                    <Markdown>{data?.content}</Markdown>
                </div>
            </TypographyStylesProvider>
        </Paper>
    </Container>
  );
};

export default AboutPage;
