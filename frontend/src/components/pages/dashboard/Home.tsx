import { Description } from "./Description"
import { TableTransaction } from "./TableTransaction"


const Home = () => {
    return (
        <>
            <div className="space-y-5 w-full mx-auto my-12">
                <div>
                    <Description />
                </div>

                <div>
                    <TableTransaction />
                </div>
            </div>

        </>
    )
}

export default Home