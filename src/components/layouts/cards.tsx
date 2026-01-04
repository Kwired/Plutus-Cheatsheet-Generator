function Cards() {

    return (
        <>
            <div
            className="bg-white border border-gray-200 shadow-md col-span-4 max-w-sm rounded-lg overflow-hidden mx-auto mt-4">
            <div className="p-6">
                <div>
                    <h3 className="text-lg font-semibold">Heading</h3>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor auctor
                        arcu, at fermentum dui. Maecenas</p>
                </div>
                <button type="button"
                    className="mt-6 px-5 py-2 rounded-md text-white text-sm font-medium tracking-wider border-none outline-none bg-blue-600 hover:bg-blue-700 cursor-pointer">View</button>
            </div>
        </div>
        <div
            className="bg-white border border-gray-200 shadow-md col-span-4 max-w-sm rounded-lg overflow-hidden mx-auto mt-4">
            <div className="p-6">
                <div>
                    <h3 className="text-lg font-semibold">Heading</h3>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor auctor
                        arcu, at fermentum dui. Maecenas</p>
                </div>
                <button type="button"
                    className="mt-6 px-5 py-2 rounded-md text-white text-sm font-medium tracking-wider border-none outline-none bg-blue-600 hover:bg-blue-700 cursor-pointer">View</button>
            </div>
        </div>
        </>
    )
}

export default Cards;