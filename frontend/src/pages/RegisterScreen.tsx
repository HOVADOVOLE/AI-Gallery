import React, { useState } from 'react';
import { 
  TextInput, 
  PasswordInput, 
  Paper, 
  Title, 
  Container, 
  Button, 
  Notification,
  Center,
  Anchor,
  Text,
  ThemeIcon
} from '@mantine/core';
import { IconLock, IconAt, IconUser, IconAlertCircle, IconCheck, IconSteeringWheel } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

import { useAuthStore } from '../store/authStore';

export function RegisterScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get actions from store
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Register User
      await api.post('/register', {
        email,
        password,
        full_name: fullName
      });
      
      setSuccess(true);

      // 2. Auto-Login
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const tokenResponse = await api.post('/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const { access_token } = tokenResponse.data;

      // 3. Save Session
      setToken(access_token);
      const userResponse = await api.get('/users/me');
      setUser(userResponse.data);

      // 4. Redirect to Dashboard immediately
      navigate('/');
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Try again.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Center mb="xl">
         <ThemeIcon size={80} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            <IconSteeringWheel size={50} />
         </ThemeIcon>
      </Center>
      <Title ta="center" order={2} fw={900}>
        Create Account
      </Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {error && (
          <Notification icon={<IconAlertCircle size="1.1rem" />} color="red" title="Error" mb="md" onClose={() => setError(null)}>
            {error}
          </Notification>
        )}
        {success && (
          <Notification icon={<IconCheck size="1.1rem" />} color="teal" title="Success!" mb="md">
            Account created. Redirecting to login...
          </Notification>
        )}

        <form onSubmit={handleRegister}>
          <TextInput 
            label="Full Name" 
            placeholder="John Doe" 
            leftSection={<IconUser size={16} />}
            value={fullName}
            onChange={(e) => setFullName(e.currentTarget.value)}
          />
          <TextInput 
            label="Email" 
            placeholder="you@example.com" 
            required 
            mt="md"
            leftSection={<IconAt size={16} />}
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <PasswordInput 
            label="Password" 
            placeholder="Your password" 
            required 
            mt="md" 
            leftSection={<IconLock size={16} />}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <Button fullWidth mt="xl" type="submit" loading={loading}>
            Register
          </Button>
        </form>

        <Text ta="center" mt="md">
          Already have an account?{' '}
          <Anchor size="sm" component="button" onClick={() => navigate('/login')}>
            Login
          </Anchor>
        </Text>
      </Paper>
    </Container>
  );
}
