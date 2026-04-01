import { useState, useEffect } from 'react';
import { Modal, Stepper, Button, Group, TextInput, NumberInput, Alert, Text, Title, Radio, Stack, Divider } from '@mantine/core';
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
import { RiSendPlane2Line, RiArrowLeftRightLine, RiExchangeFundsLine } from 'react-icons/ri';
import { useAuth } from '../../../hooks/useAuth';
import { Server, Cpu, ArrowRight } from 'lucide-react';

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

    const getNetworkIcon = (net: Network) => net === 'besu' ? <Server size={14} /> : <Cpu size={14} />;

    return (
        <Modal
            opened={open}
            onClose={closeModal}
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                        <RiSendPlane2Line size={24} />
                    </div>
                    <div>
                        <Title order={3} className="text-gray-900 font-black tracking-tight uppercase text-lg">Send USFCI</Title>
                        <Text size="xs" c="dimmed" fw={700} className="tracking-widest uppercase">Cross-Network Transfer</Text>
                    </div>
                </div>
            }
            size="lg"
            radius="1.5rem"
            centered
            padding="xl"
            overlayProps={{ blur: 10, opacity: 0.2 }}
        >
            <Stepper active={active} onStepClick={setActive} size="sm" color="red" allowNextStepsSelect={false}>
                {/* Step 0: Network & Action */}
                <Stepper.Step label="Source" description="Network & Action">
                    <Stack gap="xl" mt="xl">
                        <div>
                            <Text size="xs" fw={800} c="dimmed" mb="md" className="uppercase tracking-[0.2em]">1. Select Source Network</Text>
                            <Group grow>
                                <Button
                                    variant="outline"
                                    onClick={() => setSourceNetwork('besu')}
                                    leftSection={<Server size={18} />}
                                    radius="xl"
                                    size="md"
                                    styles={{
                                        root: {
                                            borderWidth: '2px',
                                            borderColor: '#059669',
                                            backgroundColor: sourceNetwork === 'besu' ? '#059669' : 'transparent',
                                            color: sourceNetwork === 'besu' ? 'white' : '#059669',
                                            transition: 'all 0.15s ease',
                                            '&:hover': {
                                                backgroundColor: sourceNetwork === 'besu' ? '#047857' : '#ecfdf5',
                                            },
                                        },
                                    }}
                                >
                                    Besu
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => setSourceNetwork('avalanche')}
                                    leftSection={<Cpu size={18} />}
                                    radius="xl"
                                    size="md"
                                    styles={{
                                        root: {
                                            borderWidth: '2px',
                                            borderColor: '#e11d48',
                                            backgroundColor: sourceNetwork === 'avalanche' ? '#e11d48' : 'transparent',
                                            color: sourceNetwork === 'avalanche' ? 'white' : '#e11d48',
                                            transition: 'all 0.15s ease',
                                            '&:hover': {
                                                backgroundColor: sourceNetwork === 'avalanche' ? '#be123c' : '#fff1f2',
                                            },
                                        },
                                    }}
                                >
                                    Avalanche
                                </Button>
                            </Group>
                        </div>

                        <Divider variant="dashed" />

                        <div>
                            <Text size="xs" fw={800} c="dimmed" mb="md" className="uppercase tracking-[0.2em]">2. Select Action Type</Text>
                            <Stack gap="xs">
                                <Button
                                    justify="space-between"
                                    fullWidth
                                    variant={actionType === 'transfer' ? 'filled' : 'outline'}
                                    color="dark"
                                    onClick={() => setActionType('transfer')}
                                    rightSection={<RiExchangeFundsLine size={20} />}
                                    radius="xl" size="lg"
                                >
                                    Transfer (Same Network)
                                </Button>
                                <Button
                                    justify="space-between"
                                    fullWidth
                                    variant={actionType === 'bridge' ? 'filled' : 'outline'}
                                    color="dark"
                                    onClick={() => setActionType('bridge')}
                                    rightSection={<RiArrowLeftRightLine size={20} />}
                                    radius="xl" size="lg"
                                >
                                    Bridge (Cross-Network)
                                </Button>
                            </Stack>
                        </div>
                    </Stack>
                </Stepper.Step>

                {/* Step 1: Amount */}
                <Stepper.Step label="Amount" description="Enter value">
                    <Stack mt="xl" gap="md">
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                            <div>
                                <Text size="xs" fw={700} c="dimmed" className="uppercase tracking-widest">Selected Source</Text>
                                <Group gap="xs" mt={4}>
                                    <div className={`p-1.5 rounded-md ${sourceNetwork === 'besu' ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                                        {getNetworkIcon(sourceNetwork)}
                                    </div>
                                    <Text fw={900} className="capitalize">{sourceNetwork}</Text>
                                </Group>
                            </div>
                            <div className="text-right">
                                <Text size="xs" fw={700} c="dimmed" className="uppercase tracking-widest">Action</Text>
                                <Text fw={900} className="capitalize">{actionType}</Text>
                            </div>
                        </div>
                        <NumberInput
                            {...form.getInputProps('amount')}
                            label="Transfer Amount"
                            placeholder="0.00"
                            min={0}
                            step={0.01}
                            decimalScale={2}
                            size="xl"
                            radius="xl"
                            variant="filled"
                            leftSection={<Text fw={900}>$</Text>}
                            rightSection={<Text size="xs" fw={900} mr="md" c="dimmed">USFCI</Text>}
                            rightSectionWidth={70}
                        />
                    </Stack>
                </Stepper.Step>

                {/* Step 2: Recipient */}
                <Stepper.Step label="Recipient" description="Target address">
                    <Stack mt="xl" gap="md">
                        <TextInput
                            {...form.getInputProps('recipient')}
                            label="Recipient Wallet Address"
                            placeholder="0x..."
                            size="lg"
                            radius="xl"
                            variant="filled"
                            disabled={actionType === 'bridge'}
                            description={actionType === 'bridge' ? "Bridging is pre-set to your own wallet on the target network." : "Enter the destination 0x address."}
                        />
                        {actionType === 'bridge' && (
                            <Alert color="blue" radius="xl" variant="light">
                                Your tokens will be moved from <b>{sourceNetwork}</b> to your same address on <b>{sourceNetwork === 'besu' ? 'Avalanche' : 'Besu'}</b>.
                            </Alert>
                        )}
                    </Stack>
                </Stepper.Step>

                {/* Step 3: Review */}
                <Stepper.Step label="Confirm" description="Verify details">
                    <Stack mt="xl" gap="lg" className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <RiSendPlane2Line size={120} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex flex-col items-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${sourceNetwork === 'besu' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {getNetworkIcon(sourceNetwork)}
                                </div>
                                <Text size="xs" fw={900} mt="xs" className="uppercase tracking-tighter capitalize">{sourceNetwork}</Text>
                            </div>

                            <div className="flex flex-col items-center text-gray-300">
                                <ArrowRight size={32} />
                                <Text size="10px" fw={900} className="uppercase tracking-[0.3em]">{actionType}</Text>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${actionType === 'transfer'
                                    ? (sourceNetwork === 'besu' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')
                                    : (sourceNetwork === 'besu' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white')
                                    }`}>
                                    {actionType === 'transfer' ? getNetworkIcon(sourceNetwork) : getNetworkIcon(sourceNetwork === 'besu' ? 'avalanche' : 'besu')}
                                </div>
                                <Text size="xs" fw={900} mt="xs" className="uppercase tracking-tighter capitalize">
                                    {actionType === 'transfer' ? sourceNetwork : (sourceNetwork === 'besu' ? 'avalanche' : 'besu')}
                                </Text>
                            </div>
                        </div>

                        <Divider />

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <Text size="sm" c="dimmed" fw={700}>AMOUNT TO SEND</Text>
                                <Text size="xl" fw={900}>{formatUSFCI(form.values.amount, 2)} USFCI</Text>
                            </div>
                            <div className="flex justify-between items-start">
                                <Text size="sm" c="dimmed" fw={700}>RECIPIENT</Text>
                                <Text size="xs" fw={700} className="font-mono bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-sm">
                                    {form.values.recipient.slice(0, 10)}...{form.values.recipient.slice(-10)}
                                </Text>
                            </div>
                        </div>
                    </Stack>
                </Stepper.Step>

                <Stepper.Completed>
                    <Stack align="center" py="xl" gap="xs">
                        <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-green-200 mb-4 animate-bounce">
                            <RiSendPlane2Line size={40} />
                        </div>
                        <Title order={2} className="font-black tracking-tight">Transaction Sent!</Title>
                        <Text c="dimmed" fw={600} size="sm">Your USFCI tokens are on the way.</Text>
                        <Button variant="light" color="green" radius="xl" mt="xl" size="md" onClick={closeModal} fullWidth>
                            Done
                        </Button>
                    </Stack>
                </Stepper.Completed>
            </Stepper>

            {active < 4 && (
                <Group justify="center" mt="xl">
                    <Button variant="light" color="gray" onClick={prevStep} disabled={active === 0} radius="xl" size="md" px="xl">
                        Back
                    </Button>
                    {active === 3 ? (
                        <Button
                            color="dark"
                            radius="xl"
                            size="md"
                            px="xl"
                            onClick={handleSubmit}
                            loading={isProcessing}
                            leftSection={<RiSendPlane2Line size={18} />}
                        >
                            Confirm & Send
                        </Button>
                    ) : (
                        <Button color="dark" radius="xl" size="md" px="xl" onClick={nextStep}>
                            Next Step
                        </Button>
                    )}
                </Group>
            )}
        </Modal>
    );
};