import { Description } from "./Description"
import { TableTransaction } from "./TableTransaction"


const Home = () => {
  return (
    <>
      <div className="space-y-5 w-full mx-auto my-12">
        <div className="">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-5xl font-bold">Network <span className="text-(--rojo)">Status</span></h2>
              <p className="text-gray-500 text-xl">USFCI's real-time global monitoring.</p>
            </div>
            <div className="text-right">
              <p className="text-[18px] text-gray-500 uppercase font-bold tracking-widest">Maximum transaction amount</p>
              <p className="text-red-500 font-mono font-bold text-xl">100,000,000,000 USFCI</p>
            </div>
          </div>

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