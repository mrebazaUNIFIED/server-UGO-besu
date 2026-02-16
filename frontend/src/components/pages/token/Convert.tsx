import React, { useState } from 'react';
import { MinToken } from './MinToken';
import { History } from './History';
import { BurnToken } from './BurnToken';

type TabName = 'mint' | 'history' | 'burn';

export const Convert: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabName>('mint');


    const tabClasses = (tab: TabName): string =>
        `flex-1 py-4 text-center cursor-pointer text-lg font-semibold transition-all duration-300
         ${activeTab === tab
            ? 'text-[var(--rojo)] bg-white border-b-4 border-[var(--rojo-claro)]  shadow-inner'
            : 'text-gray-500 hover:text-[var(--rojo-claro)] hover:bg-gray-50'
        }`;

    const TabContent: React.FC = () => {
        switch (activeTab) {
            case 'mint':
                return (
                    <div className="p-8 space-y-6">
                        <h2 className="text-3xl font-bold text-gray-900">Mint Tokens 💰</h2>

                        <div>
                            <MinToken />
                        </div>


                    </div>
                );
            case 'history':
                return (
                    <div className="p-8 space-y-6">
                        <div>
                            <History />
                        </div>
                    </div>
                );

            case 'burn':
                return (
                    <div className="p-8 space-y-6">
                        <div>
                            <BurnToken />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full mx-auto my-12 ">
            <div className="bg-white  overflow-hidden border border-gray-200">

                <div className="flex bg-gray-100 border-b border-gray-200 ">

                    <div
                        className={tabClasses('mint')}
                        onClick={() => setActiveTab('mint')}
                    >
                        Mint Tokens
                    </div>

                    <div
                        className={tabClasses('burn')}
                        onClick={() => setActiveTab('burn')}
                    >
                        Burn Tokens
                    </div>

                    <div
                        className={tabClasses('history')}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </div>



                </div>

                <div className="min-h-[800px]">
                    <TabContent />
                </div>

            </div>
        </div>
    );
}