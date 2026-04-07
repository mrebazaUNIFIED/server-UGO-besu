import { useState, useEffect } from 'react';
import { Modal, Button, Group, TextInput, NumberInput, Text, Title, Stack, Divider, Paper, UnstyledButton, Box, Badge } from '@mantine/core';
import { useForm } from '@mantine/form';
import { toast } from 'react-toastify';
import {
    useTransferTokensMutation,
    useTransferAvalancheMutation,
    useBridgeToAvalancheMutation,
    useBridgeToBesuMutation,
    useBalance,
    useAvalancheBalance
} from '../../../services/apiUsfci';
import { toBaseUnits, fromBaseUnits, formatUSFCI } from '../../../lib/usfciUtils';
import {
    RiSendPlane2Fill,
    RiArrowLeftRightLine,
    RiExchangeFundsLine,
    RiBankFill,
    RiShieldCheckFill,
    RiWallet3Fill,
    RiInformationFill,
    RiArrowRightLine,
    RiCheckboxCircleFill,
    RiShieldFlashFill
} from 'react-icons/ri';
import { useAuth } from '../../../hooks/useAuth';

const AvalancheLogo = ({ size = 28 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fillRule="evenodd">
            <circle fill="#E84142" fillRule="nonzero" cx="16" cy="16" r="16" />
            <path d="M11.518 22.75H8.49c-.636 0-.95 0-1.142-.123A.77.77 0 017 22.025c-.012-.226.145-.503.46-1.055l7.472-13.193c.318-.56.48-.84.682-.944a.77.77 0 01.698 0c.203.104.364.384.682.944l1.536 2.686.008.014c.343.6.517.906.593 1.226a2.26 2.26 0 010 1.066c-.076.323-.249.63-.597 1.24l-3.926 6.95-.01.017c-.346.606-.52.913-.764 1.145a2.284 2.284 0 01-.93.54c-.319.089-.675.089-1.387.089zm7.643 0h4.336c.64 0 .962 0 1.154-.126a.768.768 0 00.348-.607c.011-.219-.142-.484-.443-1.005l-.032-.054-2.172-3.722-.025-.042c-.305-.517-.46-.778-.657-.879a.762.762 0 00-.693 0c-.203.104-.363.377-.678.925l-2.165 3.722-.007.013c-.317.548-.476.821-.464 1.046a.777.777 0 00.348.606c.188.123.51.123 1.15.123z" fill="#FFF" />
        </g>
    </svg>
);

interface ModalStepperProps {
    open: boolean;
    onClose: () => void;
}

type Network = 'besu' | 'avalanche';
type ActionType = 'transfer' | 'bridge';

export const ModalStepper = ({ open, onClose }: ModalStepperProps) => {
    const [active, setActive] = useState(0);
    const { user } = useAuth();
    const walletAddress = (user as any)?.walletAddress || (user as any)?.address || '';

    // Selected options
    const [sourceNetwork, setSourceNetwork] = useState<Network>('besu');
    const [actionType, setActionType] = useState<ActionType>('transfer');

    // Balances for validation
    const { data: besuBal } = useBalance(walletAddress);
    const { data: avaBal } = useAvalancheBalance(walletAddress);

    // Mutations
    const transferBesu = useTransferTokensMutation();
    const transferAva = useTransferAvalancheMutation();
    const bridgeToAva = useBridgeToAvalancheMutation();
    const bridgeToBesu = useBridgeToBesuMutation();

    const form = useForm({
        initialValues: {
            amount: '',
            recipient: '',
        },
        validate: {
            amount: (value) => {
                if (!value || parseFloat(value) <= 0) return 'Amount must be greater than 0';
                const balRaw = sourceNetwork === 'besu' ? besuBal?.data?.balance : avaBal?.data?.balance;
                const bal = parseFloat(fromBaseUnits(balRaw || '0'));
                if (parseFloat(value) > bal) return `Insufficient balance (Available: ${formatUSFCI(bal.toString(), 2)} USFCI)`;
                return null;
            },
            recipient: (value) => !value ? 'Recipient address is required' : null,
        },
    });

    // Auto-fill recipient when bridging to self
    useEffect(() => {
        if (actionType === 'bridge') {
            form.setFieldValue('recipient', walletAddress);
        } else {
            form.setFieldValue('recipient', '');
        }
    }, [actionType, walletAddress]);

    const isProcessing = transferBesu.isPending || transferAva.isPending || bridgeToAva.isPending || bridgeToBesu.isPending;

    const nextStep = () => {
        if (active === 1) { // Amount step
            const validation = form.validateField('amount');
            if (validation.hasError) return;
        }
        if (active === 2) { // Recipient step
            const validation = form.validateField('recipient');
            if (validation.hasError) return;
        }
        setActive((current) => current + 1);
    };

    const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

    const handleSubmit = async () => {
        const amountBase = toBaseUnits(form.values.amount);
        const recipient = form.values.recipient;

        try {
            if (sourceNetwork === 'besu') {
                if (actionType === 'transfer') {
                    await transferBesu.mutateAsync({ recipient, amount: amountBase });
                } else {
                    await bridgeToAva.mutateAsync({ targetAvalanche: recipient, amount: amountBase });
                }
            } else {
                if (actionType === 'transfer') {
                    await transferAva.mutateAsync({ recipient, amount: amountBase });
                } else {
                    await bridgeToBesu.mutateAsync({ targetBesu: recipient, amount: amountBase });
                }
            }
            toast.success('Transaction submitted successfully!');
            setActive(4); // Completed step
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Transaction failed');
        }
    };

    const closeModal = () => {
        setActive(0);
        form.reset();
        onClose();
    };

    // Custom UI Components
    const ProgressFlow = () => (
        <Group gap="xs" justify="center" mb={40}>
            {[0, 1, 2, 3].map((step) => (
                <Box
                    key={step}
                    w={active === step ? 48 : 32}
                    h={6}
                    style={{
                        backgroundColor: active >= step ? '#ba181b' : '#f1f3f5',
                        borderRadius: 10,
                        transition: 'all 0.4s ease',
                        opacity: active >= step ? 1 : 0.3
                    }}
                />
            ))}
        </Group>
    );

    const SelectionCard = ({ net, isSelected, onClick, label, sublabel, icon: Icon }: any) => (
        <UnstyledButton
            onClick={onClick}
            style={{
                padding: 'var(--mantine-spacing-xl)',
                borderRadius: '2rem',
                flex: 1,
                backgroundColor: isSelected ? 'white' : '#f8f9fa',
                border: `2px solid ${isSelected ? '#ba181b' : 'transparent'}`,
                boxShadow: isSelected ? '0 15px 30px -10px rgba(186, 24, 27, 0.1)' : 'none',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
            }}
            className={isSelected ? 'scale-[1.02]' : 'hover:bg-gray-100'}
        >
            <Stack align="center" gap="sm">
                <Box
                    style={{
                        backgroundColor: isSelected ? '#ba181b' : '#f1f3f5',
                        padding: 'var(--mantine-spacing-md)',
                        borderRadius: 'var(--mantine-radius-xl)',
                        color: isSelected ? 'white' : '#9ca3af',
                        transition: 'all 0.3s'
                    }}
                >
                    <Icon size={28} />
                </Box>
                <div className="text-center">
                    <Text fw={900} size="sm" className="uppercase tracking-widest leading-none mb-1">
                        {label}
                    </Text>
                    <Text size="10px" fw={700} c="dimmed" className="uppercase tracking-tighter">
                        {sublabel}
                    </Text>
                </div>
            </Stack>
        </UnstyledButton>
    );

    return (
        <Modal
            opened={open}
            onClose={closeModal}
            size="lg"
            radius="3rem"
            centered
            padding={0}
            withCloseButton={false}
            overlayProps={{
                blur: 50,
                opacity: 0.6,
                color: '#000000ff',
            }}
            styles={{
                content: {
                    border: '1px solid rgba(0,0,0,0.05)',
                    boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25)',
                    backgroundColor: '#fff'
                }
            }}
        >
            {/* Modal Header */}
            <Box p={40} pb={20}>
                <Group justify="space-between" align="center">
                    <Stack gap={0}>
                        <Title order={2} className="text-gray-900 font-extrabold uppercase tracking-tighter text-2xl">
                            Institutional <span className="text-[#ba181b]">Portal</span>
                        </Title>
                        <Text size="xs" c="dimmed" fw={800} className="tracking-[0.2em] uppercase">Private Asset Portal • FCI Network</Text>
                    </Stack>
                    <UnstyledButton onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors font-bold text-gray-300">
                        ✕
                    </UnstyledButton>
                </Group>
            </Box>

            <Box p={40} pt={0}>
                <ProgressFlow />

                {active === 0 && (
                    <Stack gap="xl">
                        <div>
                            <Text size="xs" fw={900} c="dimmed" mb="lg" className="uppercase tracking-widest text-center">1. Select Source Network</Text>
                            <Group gap="lg">
                                <SelectionCard
                                    net="besu"
                                    label="FCI Network"
                                    sublabel="USFCI"
                                    icon={RiBankFill}
                                    isSelected={sourceNetwork === 'besu'}
                                    onClick={() => setSourceNetwork('besu')}
                                />
                                <SelectionCard
                                    net="avalanche"
                                    label="Avalanche Network"
                                    sublabel="USFCI"
                                    icon={AvalancheLogo}
                                    isSelected={sourceNetwork === 'avalanche'}
                                    onClick={() => setSourceNetwork('avalanche')}
                                />
                            </Group>
                        </div>

                        <Divider label={<Text size="8px" fw={900} className="uppercase tracking-[0.3em]">Transaction Model</Text>} labelPosition="center" />

                        <Group grow gap="md">
                            <UnstyledButton
                                onClick={() => setActionType('transfer')}
                                style={{
                                    padding: 'var(--mantine-spacing-xl)',
                                    borderRadius: '2rem',
                                    border: `2px solid ${actionType === 'transfer' ? '#161A1D' : '#f1f3f5'}`,
                                    backgroundColor: actionType === 'transfer' ? '#161A1D' : 'white',
                                    color: actionType === 'transfer' ? 'white' : '#161A1D',
                                    transition: 'all 0.2s',
                                    flex: 1
                                }}
                            >
                                <Stack align="center" gap="xs">
                                    <RiExchangeFundsLine size={24} />
                                    <Text fw={900} size="sm" className="uppercase tracking-widest">Internal</Text>
                                </Stack>
                            </UnstyledButton>

                            <UnstyledButton
                                onClick={() => setActionType('bridge')}
                                style={{
                                    padding: 'var(--mantine-spacing-xl)',
                                    borderRadius: '2rem',
                                    border: `2px solid ${actionType === 'bridge' ? '#161A1D' : '#f1f3f5'}`,
                                    backgroundColor: actionType === 'bridge' ? '#161A1D' : 'white',
                                    color: actionType === 'bridge' ? 'white' : '#161A1D',
                                    transition: 'all 0.2s',
                                    flex: 1
                                }}
                            >
                                <Stack align="center" gap="xs">
                                    <RiArrowLeftRightLine size={24} />
                                    <Text fw={900} size="sm" className="uppercase tracking-widest">Cross-Bridge</Text>
                                </Stack>
                            </UnstyledButton>
                        </Group>
                    </Stack>
                )}

                {active === 1 && (
                    <Stack gap="xl">
                        <Text size="xs" fw={900} c="dimmed" className="uppercase tracking-widest text-center">2. Financial Distribution</Text>

                        <Paper p={40} radius="2.5rem" style={{ border: '1px solid rgba(0,0,0,0.03)', backgroundColor: '#f8f9fa' }}>
                            <Stack gap={0} align="center">
                                <Text size="4rem" fw={1000} className="text-[#ba181b] leading-none mb-4">$</Text>
                                <NumberInput
                                    {...form.getInputProps('amount')}
                                    placeholder="0.00"
                                    min={0}
                                    size="xl"
                                    variant="unstyled"
                                    styles={{
                                        input: {
                                            textAlign: 'center',
                                            fontSize: '3.5rem',
                                            fontWeight: 900,
                                            color: '#161A1D'
                                        }
                                    }}
                                />
                                <Text fw={900} c="dimmed" size="sm" className="tracking-[0.3em] uppercase mt-2">USFCI Asset Units</Text>
                            </Stack>
                        </Paper>

                        <Paper p="md" radius="xl" style={{ border: '1px solid #fee2e2', backgroundColor: '#fff5f5' }}>
                            <Group gap="sm" justify="center">
                                <RiInformationFill className="text-[#ba181b]" />
                                <Text size="xs" fw={800} className="text-[#ba181b] uppercase tracking-wider">
                                    Transaction will be processed on the {sourceNetwork === 'besu' ? 'FCI Network' : 'Avalanche Network'}
                                </Text>
                            </Group>
                        </Paper>
                    </Stack>
                )}

                {active === 2 && (
                    <Stack gap="xl">
                        <Text size="xs" fw={900} c="dimmed" className="uppercase tracking-widest text-center">3. Recipient Address</Text>

                        <TextInput
                            {...form.getInputProps('recipient')}
                            label={<Text size="xs" fw={900} c="dimmed" className="uppercase tracking-widest mb-2">Recipient 0x Address</Text>}
                            placeholder="0x..."
                            size="lg"
                            radius="xl"
                            variant="filled"
                            disabled={actionType === 'bridge'}
                            leftSection={<RiWallet3Fill size={20} className="text-[#ba181b]" />}
                            styles={{
                                input: {
                                    fontSize: '1.2rem',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                    paddingLeft: '50px !important'
                                }
                            }}
                        />

                        {actionType === 'bridge' ? (
                            <Paper withBorder p="xl" radius="2.5rem" style={{ borderStyle: 'dashed', borderColor: '#ba181b', backgroundColor: '#f8f9fa' }}>
                                <Stack align="center" gap="sm">
                                    <RiShieldCheckFill size={40} className="text-[#ba181b]" />
                                    <Text fw={900} size="sm" className="uppercase tracking-widest text-center">Auto-routing to Your Wallet</Text>
                                    <Text size="xs" c="dimmed" fw={600} className="text-center uppercase tracking-tighter">
                                        Funds will be sent directly to your connected wallet address.
                                    </Text>
                                </Stack>
                            </Paper>
                        ) : (
                            <Text size="xs" c="dimmed" fw={600} className="text-center uppercase tracking-tighter">
                                Ensure destination address is cleared for institutional routing.
                            </Text>
                        )}
                    </Stack>
                )}

                {active === 3 && (
                    <Stack gap="xl">
                        <Text size="xs" fw={900} c="dimmed" className="uppercase tracking-widest text-center">4. Review & Confirm</Text>

                        <Paper radius="3rem" p={40} bg="#161A1D" style={{ color: 'white', position: 'relative', overflow: 'hidden' }}>
                            <Stack gap="xl" align="center">
                                <Group gap={60} align="center">
                                    <Stack align="center" gap={4}>
                                        <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                            {sourceNetwork === 'besu' ? <RiBankFill size={24} /> : <AvalancheLogo size={24} />}
                                        </div>
                                        <Text size="8px" fw={900} className=" uppercase tracking-widest ">{sourceNetwork === 'besu' ? 'FCI Network' : 'Avalanche Network'}</Text>
                                    </Stack>

                                    <RiArrowRightLine size={30} className="text-[#ba181b]" />

                                    <Stack align="center" gap={4}>
                                        <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                            {actionType === 'transfer'
                                                ? (sourceNetwork === 'besu' ? <RiBankFill size={24} /> : <AvalancheLogo size={24} />)
                                                : (sourceNetwork === 'besu' ? <AvalancheLogo size={24} /> : <RiBankFill size={24} />)
                                            }
                                        </div>
                                        <Text size="8px" fw={900} className="uppercase tracking-widest ">
                                            {actionType === 'transfer'
                                                ? (sourceNetwork === 'besu' ? 'FCI Network' : 'Avalanche Network')
                                                : (sourceNetwork === 'besu' ? 'Avalanche Network' : 'FCI Network')
                                            }
                                        </Text>
                                    </Stack>
                                </Group>

                                <Divider className="w-full opacity-10" />

                                <Group justify="space-between" align="center" w="100%">
                                    <Stack gap={0}>
                                        <Text size="xs" fw={900} className="uppercase tracking-[0.2em] opacity-40">Authorized Disbursement</Text>
                                        <Text size="2.5rem" fw={1000}>{formatUSFCI(form.values.amount, 2)} <span className="text-sm opacity-50 font-bold">USFCI</span></Text>
                                    </Stack>
                                    <RiShieldCheckFill size={48} className="text-green-500" />
                                </Group>

                                <Box w="100%" p="md" bg="white/5" style={{ borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Stack gap={4}>
                                        <Text size="8px" fw={900} className="uppercase tracking-widest opacity-40">FCI Private Network Target</Text>
                                        <Text size="xs" fw={800} className="font-mono tracking-tighter">
                                            {form.values.recipient.slice(0, 20)}...{form.values.recipient.slice(-14)}
                                        </Text>
                                    </Stack>
                                </Box>
                            </Stack>
                        </Paper>
                    </Stack>
                )}

                {active === 4 && (
                    <Stack align="center" py={40} gap="xl">
                        <Box style={{ position: 'relative' }}>
                            <RiCheckboxCircleFill size={100} className="text-[#ba181b]" />
                        </Box>
                        <Stack gap={4} align="center">
                            <Title order={2} className="uppercase font-black tracking-tighter text-3xl">Authorized</Title>
                            <Text fw={800} c="dimmed" size="xs" className="uppercase tracking-[0.4em]">Transaction Propagating</Text>
                        </Stack>
                        <Text size="xs" c="dimmed" fw={700} className="text-center px-10 uppercase tracking-tighter leading-relaxed">
                            Signatures verified. Your asset disbursement has been successfully transmitted through the institutional gateway.
                        </Text>
                        <Button
                            variant="filled"
                            color="dark"
                            radius="2rem"
                            size="lg"
                            px={60}
                            onClick={closeModal}
                        >
                            Return to Portal
                        </Button>
                    </Stack>
                )}

                {active < 4 && (
                    <Group grow mt={50} gap="lg">
                        <Button
                            variant="subtle"
                            color="gray"
                            onClick={prevStep}
                            disabled={active === 0}
                            radius="2rem"
                            size="lg"
                            fw={900}
                            className="uppercase tracking-widest"
                        >
                            Back
                        </Button>
                        <Button
                            onClick={active === 3 ? handleSubmit : nextStep}
                            loading={isProcessing}
                            radius="2rem"
                            size="lg"
                            color="dark"
                            fw={1000}
                            className="uppercase tracking-[0.3em] shadow-xl transition-all"
                            styles={{
                                root: {
                                    backgroundColor: active === 3 ? '#ba181b' : '#161A1D',
                                    border: 'none'
                                }
                            }}
                        >
                            {active === 3 ? 'Send Transfer' : 'Continue'}
                        </Button>
                    </Group>
                )}
            </Box>
        </Modal>
    );
};