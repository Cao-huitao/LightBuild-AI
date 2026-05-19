import React from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import Header from './header';
import Material from './material';
import Setting from './setting';
import CanvasStage from './stage/CanvasStage';
import ProdStage from './stage/prod';
import { useComponents } from '../stores/components';

const Layout: React.FC = () => {
    const { mode } = useComponents();

    return (
        <div className='h-[100vh] flex flex-col'>
            <div className='h-[50px] flex items-center border-solid border-[1px] border-b-[#ccc]'>
                <Header />
            </div>
            {mode === 'edit' ? (
                <Allotment>
                    <Allotment.Pane preferredSize={200} maxSize={400} minSize={200}>
                        <Material />
                    </Allotment.Pane>
                    <Allotment.Pane>
                        <CanvasStage />
                    </Allotment.Pane>
                    <Allotment.Pane preferredSize={300} maxSize={500} minSize={300}>
                        <Setting />
                    </Allotment.Pane>
                </Allotment>
            ) : (
                <ProdStage />
            )}
        </div>
    )
}

export default Layout;
