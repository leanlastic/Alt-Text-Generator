import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  Loader,
  Main,
  TextInput,
  Toggle,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../../pluginId';

const Settings = () => {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openAIConfigured, setOpenAIConfigured] = useState(true);
  const [form, setForm] = useState({ language: 'English', autoGenerate: true });

  useEffect(() => {
    (async () => {
      try {
        const res = await get(`/${PLUGIN_ID}/settings`);
        setForm({
          language: res.data?.data?.language ?? 'English',
          autoGenerate: res.data?.data?.autoGenerate ?? true,
        });
        setOpenAIConfigured(Boolean(res.data?.openAIConfigured));
      } catch (err) {
        toggleNotification({
          type: 'danger',
          message: err?.response?.data?.error?.message || err.message || 'Failed to load settings',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [get, toggleNotification]);

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await put(`/${PLUGIN_ID}/settings`, form);
      setForm({
        language: res.data?.data?.language ?? form.language,
        autoGenerate: res.data?.data?.autoGenerate ?? form.autoGenerate,
      });
      toggleNotification({ type: 'success', message: 'Settings saved' });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: err?.response?.data?.error?.message || err.message || 'Failed to save',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Main>
        <Flex justifyContent="center" padding={8}>
          <Loader>Loading…</Loader>
        </Flex>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
          <Box>
            <Typography variant="alpha" tag="h1">
              Alt Text Generator
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">
                Configure the alt text generator.
              </Typography>
            </Box>
          </Box>
          <Button onClick={onSave} loading={saving} disabled={saving}>
            Save
          </Button>
        </Flex>

        <Box
          background={openAIConfigured ? 'success100' : 'danger100'}
          padding={4}
          hasRadius
          marginBottom={6}
        >
          <Typography textColor={openAIConfigured ? 'success700' : 'danger700'}>
            {openAIConfigured
              ? 'OpenAI API key detected.'
              : 'OPENAI_API_KEY is not set. Add it to your Strapi .env file and restart.'}
          </Typography>
        </Box>

        <Box background="neutral0" hasRadius shadow="tableShadow" padding={6}>
          <Flex direction="column" alignItems="stretch" gap={6}>
            <Field.Root name="language" hint="Language alt text should be written in (e.g. English, Deutsch, Français).">
              <Field.Label>Language</Field.Label>
              <TextInput
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              />
              <Field.Hint />
            </Field.Root>

            <Field.Root
              name="autoGenerate"
              hint="When enabled, alt text is generated automatically for new image uploads that don't already have one."
            >
              <Field.Label>Auto-generate on upload</Field.Label>
              <Toggle
                checked={form.autoGenerate}
                onLabel="On"
                offLabel="Off"
                onChange={() => setForm((f) => ({ ...f, autoGenerate: !f.autoGenerate }))}
              />
              <Field.Hint />
            </Field.Root>
          </Flex>
        </Box>
      </Box>
    </Main>
  );
};

export default Settings;
