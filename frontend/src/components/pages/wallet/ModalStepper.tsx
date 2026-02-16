import { useState } from 'react';
import { Modal, Stepper, Button, Group, TextInput, NumberInput, Alert, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { toast } from 'react-toastify';
import { transfer } from '../../../services/api';
import { toBaseUnits } from '../../../lib/usfciUtils';
import { RiSendPlane2Line } from 'react-icons/ri';

interface ModalStepperProps {
    open: boolean;
    onClose: () => void;
}

export const ModalStepper = ({ open, onClose }: ModalStepperProps) => {
    const [active, setActive] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const form = useForm({
        initialValues: {
            amount: '',
            recipientWalletAddress: '',
            description: '',
        },
        validate: {
            amount: (value) =>
                !value || parseFloat(value) <= 0 ? 'Amount must be greater than 0' : null,
            recipientWalletAddress: (value) =>
                !value ? 'Recipient wallet address is required' : null,
        },
    });

    const nextStep = () => {
        if (active === 0) {
            form.validateField('amount');
            if (form.isValid('amount')) {
                setActive((current) => (current < 2 ? current + 1 : current));
            }
        } else if (active === 1) {
            form.validateField('recipientWalletAddress');
            if (form.isValid('recipientWalletAddress')) {
                setActive((current) => (current < 2 ? current + 1 : current));
            }
        }
    };

    const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

    const handleSubmit = async () => {
        const { hasErrors } = form.validate();
        if (hasErrors) return;

        try {
            setIsLoading(true);
            
            // ✅ Convertir el monto a unidades base (18 decimales)
            const amountInBaseUnits = toBaseUnits(form.values.amount);
            
            console.log('Amount entered:', form.values.amount, 'USFCI');
            console.log('Amount in base units:', amountInBaseUnits);
            
            const response = await transfer(
                form.values.recipientWalletAddress,
                amountInBaseUnits, 
            );
            
            toast.success(`Transfer of ${form.values.amount} USFCI successful!`);
            setIsCompleted(true);
            setActive(3);
        } catch (error: any) {
            toast.error(`Transfer failed: ${error.response?.data?.error || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const closeModal = () => {
        setActive(0);
        setIsCompleted(false);
        form.reset();
        onClose();
    };

    return (
        <Modal
            opened={open}
            onClose={closeModal}
            title={
                <Title order={2} className="flex items-center gap-2 text-[var(--rojo)]">
                    Send USFCI Tokens
                </Title>
            }
            size="80%"
            radius="md"
            centered
            classNames={{
                header: 'bg-blue-50 border-b-blue-200',
                title: 'text-2xl font-bold',
                content: 'p-6',
            }}
        >
            <form onSubmit={form.onSubmit(() => { })}>
                <Stepper active={active} onStepClick={setActive} size="lg">
                    <Stepper.Step label="Amount" description="Enter transfer amount">
                        <Text size="sm" c="dimmed" mb="xl">
                            Enter the amount of USFCI you want to send. 1 USFCI = $1 USD
                        </Text>
                        <NumberInput
                            {...form.getInputProps('amount')}
                            label="Amount (USFCI)"
                            placeholder="0.00"
                            min={0}
                            step={0.01}
                            decimalScale={2}
                            size="lg"
                            classNames={{ input: 'text-right font-mono' }}
                            variant="filled"
                            radius="md"
                            leftSection={<span className="text-gray-500">$</span>}
                        />
                        <Text size="xs" c="dimmed" mt="xs">
                            💡 Example: Enter "100" to send 100 USFCI ($100 USD)
                        </Text>
                    </Stepper.Step>

                    <Stepper.Step label="Recipient" description="Enter wallet address">
                        <Text size="sm" c="dimmed" mb="xl">
                            Enter the recipient's wallet address. Double-check for accuracy.
                        </Text>
                        <TextInput
                            {...form.getInputProps('recipientWalletAddress')}
                            label="Recipient Wallet Address"
                            placeholder="0x..."
                            size="lg"
                            variant="filled"
                            radius="md"
                        />
                       
                    </Stepper.Step>

                    <Stepper.Step label="Review" description="Confirm details">
                        <Text size="sm" c="dimmed" mb="xl">
                            Review your transfer details carefully before confirming.
                        </Text>
                        <Alert color="var(--rojo)" title="Transfer Summary" radius="md" mb="xl" variant="filled">
                            <Text fw={500}>
                                Amount: {form.values.amount || '0'} USFCI 
                                <Text span c="dimmed" size="sm"> (≈ ${form.values.amount || '0'} USD)</Text>
                            </Text>
                            <Text fw={500} mt="xs">
                                To:{' '}
                                {form.values.recipientWalletAddress
                                    ? `${form.values.recipientWalletAddress.slice(0, 8)}...${form.values.recipientWalletAddress.slice(-8)}`
                                    : 'N/A'}
                            </Text>
                            {form.values.description && (
                                <Text fw={500} mt="xs">
                                    Description: {form.values.description}
                                </Text>
                            )}
                        </Alert>
                       
                    </Stepper.Step>

                    <Stepper.Completed>
                        <Text size="sm" c="dimmed" mb="xl">
                            Your transfer has been completed successfully!
                        </Text>
                        <Alert
                            color="green"
                            title="Transaction Successful"
                            radius="md"
                            variant="filled"
                            icon={<RiSendPlane2Line className="w-5 h-5" />}
                        >
                            <Text fw={500}>
                                {form.values.amount} USFCI sent successfully. Check your transaction history for details.
                            </Text>
                        </Alert>
                    </Stepper.Completed>
                </Stepper>

                <Group justify="center" mt="xl" wrap="nowrap" gap="md">
                    {active !== 3 && (
                        <>
                            <Button
                                variant="default"
                                onClick={prevStep}
                                disabled={active === 0}
                                size="lg"
                                radius="md"
                            >
                                Back
                            </Button>
                            {active === 2 ? (
                                <Button
                                    onClick={handleSubmit}
                                    loading={isLoading}
                                    size="lg"
                                    radius="md"
                                    leftSection={<RiSendPlane2Line className="w-4 h-4" />}
                                    variant="gradient"
                                    gradient={{ from: 'black', to: 'black' }}
                                >
                                    Confirm & Send
                                </Button>
                            ) : (
                                <Button
                                    onClick={nextStep}
                                    size="lg"
                                    radius="md"
                                    variant="gradient"
                                    gradient={{ from: 'black', to: 'black' }}
                                >
                                    Next Step
                                </Button>
                            )}
                        </>
                    )}
                    {active === 3 && (
                        <Button
                            onClick={closeModal}
                            size="lg"
                            radius="md"
                            variant="gradient"
                            gradient={{ from: 'green', to: 'teal' }}
                            leftSection={<RiSendPlane2Line className="w-4 h-4" />}
                        >
                            Done
                        </Button>
                    )}
                </Group>
            </form>
        </Modal>
    );
};