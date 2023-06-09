import { sendRequest } from '../hooks/sendRequest'
import { getCookie } from '../hooks/getCookie'


let status = 2

const init = async () => {
    let indentList
    let total
        
    const getIndentList = () => {
        return new Promise( async (resolve)=>{
            const {havenUid} = getCookie()
            if(havenUid === undefined){
                location.href = '../../'
            }
            const response = await sendRequest(
                'POST',
                '/indent/get',
                {
                    user_id: havenUid,
                    status
                }
            )
            const _indentList = response.data
            if(_indentList.length === 0){
                resolve(undefined)
            }
            _indentList.forEach((item, index, arr)=>{
                sendRequest(
                    'POST',
                    '/item/get',
                    {
                        condition:`id = ${item.item_id}`
                    }
                ).then((response)=>{
                    item.name = response.data[0].direction
                    let _pngList = response.data[0].png.split(',')
                    _pngList = _pngList.map((item, index)=>{
                        return item.split('"')[1]
                    })
                    let _paramList = response.data[0].more_type_0.split(',').map((item)=>{
                        item = item.replace('"','')
                        item = item.replace('"','')
                        item = item.replace('[','')
                        item = item.replace(']','')
                        return item
                    })
                    let pngIndex 
                    _paramList.forEach((_item, _index)=>{
                        if(_item === item.more_type_0){
                            pngIndex = _index
                        }
                    })
                    if(response.data[0].discount){
                        item.price = parseInt(response.data[0].price * response.data[0].discount)
                    }else{
                        item.price = response.data[0].price
                    }
                    item.png = _pngList[pngIndex]
                    item.tag = response.data[0].tag
                    item.old_price = response.data[0].price
                    item.discount = response.data[0].discount
                    item.brand = response.data[0].brand
                    item.total_price = parseInt(item.number) * parseInt(item.price)
                    item.discount_price = (parseInt(response.data[0].price) - parseInt(item.price)) * parseInt(item.number)
                    item.chose = false
                    if(index === arr.length-1){
                        resolve(arr.reverse())
                    }
                })
            })
        })
    }
    
    const indentTemplate = (item) => {
        return `
    <div class="indent-main-indent-option">
        <div class="indent-main-indent-wrapper">
            <div class="indent-main-indent-row-1">
                <div class="indent-main-indent-img-wrapper">
                    <img src=${item.png} class="indent-main-indent-img">
                </div>
                <div class="indent-main-indent-msg-wrapper">
                    <div class="indent-main-indent-title-wrapper">
                        <span class="indent-main-indent-title">
                            ${item.name.slice(0,25)}...
                        </span>
                    </div>
                    
                    <div class="indent-main-indent-params-wrapper">
                        <div class="indent-main-indent-type">
                            ${item.more_type_0}
                        </div>
                        <div class="indent-main-indent-type">
                            ${item.more_type_1}
                        </div>
                        <div class="indent-main-indent-number">
                            数量:${item.number}
                        </div>
                    </div>
                    <div class="indent-main-indent-tags-wrapper">
                        <div class="indent-main-indent-tag">
                            待付款
                        </div>
                    </div>  
                </div>
                
                <div class="indent-main-indent-old-price-wrapper">
                    <div></div>
                    <div class="indent-main-indent-old-price">¥ ${item.old_price.toFixed(2)}</div>
                </div>
            </div>
        </div>
        <div class="indent-main-indent-discount-price-wrapper">
            <span class="indent-main-indent-discount-price-word">
                优惠：
            </span>
            <span class="indent-main-indent-discount-price">
                - ¥ ${item.discount_price.toFixed(2)}
            </span>
        </div>
        <div class="indent-main-indent-price-wrapper">
            
            <div>
                <span class="indent-main-indent-price-word">
                    小计：
                </span>
                <span class="indent-main-indent-price">
                    ¥ ${item.total_price.toFixed(2)}
                </span>
            </div>
            <div class="indent-main-indent-action-button">
                <div class="indent-main-indent-cancel-button">
                    取消
                </div>
                <div class="indent-main-indent-buy-button">
                    付款
                </div>
            </div>
        </div>
    </div>
    `
    }
    
    indentList = await getIndentList()
    const renderIndentList = (indentList)=>{
        const indentWrapper = document.getElementsByClassName('indent-main')[0]
        let indentHTML = ``
        if(indentList === undefined){
            indentWrapper.innerHTML = `
                <img class="indent-none-img" src="/png/indent_none">
            `
        }else{
            indentList.forEach((item,index)=>{
                if(item.name === undefined){
                    renderIndentList()
                }else{
                    indentHTML += indentTemplate(item)
                }
            })
            indentWrapper.innerHTML = indentHTML
        }

        const cancelButtonList = Array.from(document.getElementsByClassName('indent-main-indent-cancel-button'))
        const buyButtonList = Array.from(document.getElementsByClassName('indent-main-indent-buy-button'))

        const indentImgElementList = Array.from(document.getElementsByClassName('indent-main-indent-img-wrapper'))
        indentImgElementList.forEach((item, index)=>{
            item.addEventListener('click',()=>{
                location.href = `/app/item/?item_id=${indentList[index].item_id}`
            })
        })

        const theConfirm = (string,fun) => {
            const wrapper = document.getElementsByClassName('the-confirm-wrapper')[0]
            wrapper.style.display='flex'
            const pad = wrapper.getElementsByClassName('the-confirm-tip')[0]
            pad.innerText = string
            const cancelButton = wrapper.getElementsByClassName('the-confirm-cancel-button')[0]
            cancelButton.addEventListener('click',()=>{
                wrapper.style.display = 'none'
            })
            const confirmButton = wrapper.getElementsByClassName('the-confirm-confirm-button')[0]
            confirmButton.addEventListener('click',()=>{
                wrapper.style.display = 'none'
                fun()
            })
        }

        const actionSubmit = (status, index) => {
            if(status === 0){
                theConfirm('确定取消付款？',
                    () => {
                        sendRequest(
                            'POST',
                            '/indent/merge',
                            {
                                indentList: JSON.stringify(indentList[index])
                            }
                        ).then((response)=>{
                            if(response.data === false){
                                sendRequest(
                                    'POST',
                                    '/indent/update',
                                    {
                                        indentId: indentList[index].id,
                                        assign: `status = ${status}`
                                    }
                                ).then(()=>{
                                    renderIndentList()
                                    location.reload()
                                })
                            }else{
                                renderIndentList()
                                location.reload()
                            }
                        })
                    }
                )
            }else
            if(status === 3){
                let arr = []
                arr.push(indentList[index])
                let _indentList = JSON.stringify(arr)
                sessionStorage.setItem('choseIndentList', _indentList)
                location.href = '/app/indent_submit'
            }
        }
        
        cancelButtonList.forEach((item, index)=>{
            item.addEventListener('click', ()=>{
                actionSubmit(0, index)
            })
        })

        buyButtonList.forEach((item, index)=>{
            item.addEventListener('click', ()=>{
                actionSubmit(3, index)
            })
        })

    }
    renderIndentList(indentList)
    
    // const backButton = document.getElementsByClassName('search-header-back-button')[0]
    // backButton.addEventListener('click',()=>{
    //     location.href = '/app/my'
    // })
    
    const searchInput = document.getElementsByClassName('home-search-input')[0]
    searchInput.addEventListener('input', ()=>{
        let keyword = searchInput.value
        let searchIndentList = indentList.filter((item)=>{
            return item.name.indexOf(keyword) !== -1
        })
        renderIndentList(searchIndentList)
    })
}
init()