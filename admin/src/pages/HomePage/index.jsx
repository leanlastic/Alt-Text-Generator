import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Loader,
  Main,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../../pluginId';

const HomePage = () => {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [bulkRunning, setBulkRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get(`/${PLUGIN_ID}/missing?limit=200`);
      setRows(res.data?.data || []);
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: err?.response?.data?.error?.message || err.message || 'Failed to load',
      });
    } finally {
      setLoading(false);
    }
  }, [get, toggleNotification]);

  useEffect(() => {
    load();
  }, [load]);

  const markBusy = (id, busy) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const generateOne = async (id) => {
    markBusy(id, true);
    try {
      await post(`/${PLUGIN_ID}/generate/${id}`);
      toggleNotification({ type: 'success', message: 'Alt text generated' });
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: err?.response?.data?.error?.message || err.message || 'Generation failed',
      });
    } finally {
      markBusy(id, false);
    }
  };

  const runBackfill = async () => {
    setBulkRunning(true);
    try {
      const res = await post(`/${PLUGIN_ID}/backfill`, { limit: 200, delayMs: 500 });
      const { saved = 0, failed = 0, skipped = 0 } = res.data?.data || {};
      toggleNotification({
        type: failed > 0 ? 'warning' : 'success',
        message: `Backfill finished — ${saved} saved, ${failed} failed, ${skipped} skipped`,
      });
      await load();
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: err?.response?.data?.error?.message || err.message || 'Backfill failed',
      });
    } finally {
      setBulkRunning(false);
    }
  };

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
                {total} image{total === 1 ? '' : 's'} missing alt text
              </Typography>
            </Box>
          </Box>
          <Button
            onClick={runBackfill}
            loading={bulkRunning}
            disabled={bulkRunning || loading || rows.length === 0}
          >
            Generate all missing
          </Button>
        </Flex>

        {loading ? (
          <Flex justifyContent="center" padding={8}>
            <Loader>Loading…</Loader>
          </Flex>
        ) : rows.length === 0 ? (
          <Box
            background="neutral0"
            hasRadius
            shadow="tableShadow"
            padding={8}
          >
            <Typography textColor="neutral600">
              No images missing alt text. Nice work.
            </Typography>
          </Box>
        ) : (
          <Box background="neutral0" hasRadius shadow="tableShadow">
            <Table colCount={3} rowCount={rows.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">Preview</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">File</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Actions</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      {row.url ? (
                        <img
                          src={row.url}
                          alt=""
                          style={{
                            width: 64,
                            height: 64,
                            objectFit: 'cover',
                            borderRadius: 4,
                            background: '#eee',
                          }}
                        />
                      ) : null}
                    </Td>
                    <Td>
                      <Flex direction="column" alignItems="flex-start" gap={1}>
                        <Typography fontWeight="bold">{row.name}</Typography>
                        <Typography variant="pi" textColor="neutral600">
                          {row.mime}
                          {row.width && row.height ? ` • ${row.width}×${row.height}` : ''}
                        </Typography>
                      </Flex>
                    </Td>
                    <Td>
                      <Button
                        size="S"
                        variant="secondary"
                        loading={busyIds.has(row.id)}
                        disabled={busyIds.has(row.id) || bulkRunning}
                        onClick={() => generateOne(row.id)}
                      >
                        Generate
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </Main>
  );
};

export default HomePage;
