/// <reference types="Cypress" />
import Web3 from "web3";
import PrivateKeyProvider from "truffle-privatekey-provider";

const root = '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7'
const finance = '0x1902a0410efe699487dd85f12321ad672be4ada2'

context('Open Enterprise', () => {
  before(() => {
    cy.on("window:before:load", (win) => {
      const provider = new PrivateKeyProvider(
        "A8A54B2D8197BC0B19BB8A084031BE71835580A01E70A45A13BABD16C9BC1563",
        "http://localhost:8545"
      );
      win.web3 = new Web3(provider);
    });
    cy.on("window:load", async (win) => {
      if (win.web3) {
        console.log(win.web3)
        await win.web3.eth.sendTransaction({ 
          from: root,  
          to: finance, // needs to be updated when aragonCLI or aragen are updated
          value: 2e18, 
          gas: 350000 
        })

        let tokenAddress = "0xf2804D07A941F77F34EEEb252D172E4268d0e9D4"
        // Use BN
        let decimals = win.web3.utils.toBN(18);
        let amount = win.web3.utils.toBN(1);
        let minFinanceABI = [{
          "constant": false,
          "inputs": [
            {
              "name": "_token",
              "type": "address"
            },
            {
              "name": "_amount",
              "type": "uint256"
            },
            {
              "name": "_reference",
              "type": "string"
            }
          ],
          "name": "deposit",
          "outputs": [],
          "payable": true,
          "stateMutability": "payable",
          "type": "function"
        }]
        let minTokenABI = [
          // approve
          {
            "constant": false,
            "inputs": [
                {
                    "name": "_spender",
                    "type": "address"
                },
                {
                    "name": "_value",
                    "type": "uint256"
                }
            ],
            "name": "approve",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
          },
          // transfer
          {
            "constant": false,
            "inputs": [
              {
                "name": "_to",
                "type": "address"
              },
              {
                "name": "_value",
                "type": "uint256"
              }
            ],
            "name": "transfer",
            "outputs": [
              {
                "name": "",
                "type": "bool"
              }
            ],
            "type": "function"
          }
        ];
        // Get ERC20 Token contract instance
        let tokenContract = new win.web3.eth.Contract(minTokenABI, tokenAddress)
        // calculate ERC20 token amount
        let value = amount.mul(win.web3.utils.toBN(10).pow(decimals))
        // call approve function
        await tokenContract.methods.approve(finance, value.toString())
        .send( {from: root}, (error, txHash) => {
          // it returns tx hash because sending tx
          console.log('tokens approved: ',txHash)
        })

        // Get Finance Contract instance
        let financeContract = new win.web3.eth.Contract(minFinanceABI, finance)
        await financeContract.methods.deposit(tokenAddress, value.toString(), 'E2E test deposit')
        .send( {from: root, gas: 700000}, (error, txHash) => {
          // it returns tx hash because sending tx
          console.log('tokens transferred: ',txHash)
        })
      }
    })
    cy.visit('http://localhost:3000/#/dev-test')
  })

  context('Address Book', ()=> {
    before(() => {
      cy.contains('button','Address Book',{ timeout: 150000 }).wait(1000).click()
    })
    it('creates Address Entry', () =>{
      
      // This might be a less verbose way to interact with elements inside an
      // iframe: https://github.com/cypress-io/cypress/issues/136#issuecomment-328100955
      cy.getWithinIframe('button:contains("New entity")').trigger('click')
      .getWithinIframe('input[name="name"]').type('Hello World', { force: true })
      .getWithinIframe('input[name="address"]').type('0xb4124ceb3451635dacedd11767f004d8a28c6ee7', { force: true })
      .getWithinIframe('button:contains("Submit Entity")').click()

      cy.contains('button','Create transaction').click()
      cy.contains('button','Close').click()
      cy.getWithinIframe('div.TableView___StyledTd-aczwu3-3:contains("Hello World")')
    })
    it('removes Address Entry', () => {
      cy.wait(1000).getWithinIframe('button.fcvbGI').trigger('click') // click the button that opens the context menu
      .getWithinIframe('Button:contains("Remove")').trigger('click').wait(1000)

      cy.contains('button','Create transaction').click()
      cy.contains('button','Close').click().wait(1000)
    })
  })

  context('Allocations', () => {
    before(() => {
      cy.contains('button','Allocations',{ timeout: 150000 }).wait(5000).click()
    })
    it('creates a budget', () => {
      cy.getWithinIframe('button:contains("New budget")').trigger('click')
      .getWithinIframe('input[name="name"]').click().type('Hello World', { force: true }).wait(1000)
      // For some reason this element doesn't accept Cypress' keypressed numbers, so I had to update the attribute then
      // use 'type' to get the panel state to update
      .getWithinIframe('input[name="amount"]').then(([ input ]) => input.setAttribute('value', 1.25)).type(0, {force: true})
      .getWithinIframe('button:contains("Create budget")').click()

      cy.contains('button','Create transaction').click()
      cy.contains('button','Close').click().wait(1000)
    })
    it('creates an allocation', () => {
      // click on budget card context menu
      cy.wait(5000).getWithinIframe('button.fcvbGI').first().trigger('click')
      .getWithinIframe('Button:contains("New Allocation")').trigger('click').wait(1000)
      .getWithinIframe('input[name="description"]').click().type('Try Hello World', { force: true }).wait(1000)
      .getWithinIframe('input[name="amount"]').then(([ input ]) => input.setAttribute('value', 0.25)).type(0, {force: true})
      .getWithinIframe('input.bXQbja').click().type('0xb4124ceb3451635dacedd11767f004d8a28c6ee7', { force: true }).wait(1000)
      .getWithinIframe('Button:contains("Submit")').trigger('click').wait(1000)

      cy.contains('button','Create transaction').click()
      cy.contains('button','Close').click().wait(1000)
    })
    context('Dot Voting', () => {
      before(() => {
        cy.contains('button','Dot Voting',{ timeout: 150000 }).click().wait(5000)
      })
      it('votes for Allocation', () => {
        cy.wait(5000).getWithinIframe('div.XwjlG').first().click().wait(1500)
        .getWithinIframe('Button:contains("Vote")').click()
        .getWithinIframe('div.jnspDJ').trigger('mousedown', { which: 1, x: 500, y: 5}).trigger('mouseup').wait(500)
        cy.getWithinIframe('button:contains("Submit Vote")').click().wait(1000)

        cy.contains('button','Create transaction').click()
        cy.contains('button','Close').click().wait(1000)
        /*
        
        .get('iframe').iframe().wait(1000).find('div').each((el) => {
          if (/VoteStatus__StatusLabel/.test(el[0].className)) {
            console.log('++ found sidepanel', el[0])
            cy.wrap(el[0]).within(($el) => {
  
              cy.find('span').each((el) => {
                if (/VoteStatus__StatusLabel/.test(el[0].className)) {
                  console.log('+!!!+', el[0])
                }
              })
              
            })
          }
        })
        .get('iframe').iframe().find('input').each((el) => {
          if (/TextInput/.test(el[0].className)) {
            console.log('--', el[0].className)
            el[0].click()
          }
        })
        */
      })

      it('executes the vote', () => {
        cy.wait(6000).getWithinIframe('div.XwjlG').first().click().wait(1500)
        cy.getWithinIframe('button:contains("Execute Vote")').click()

        cy.contains('button','Create transaction').click()
      cy.contains('button','Close').click().wait(1000)
      })
    })
  })

  context('Rewards', () => {
    before(() => {
      cy.contains('button','Rewards',{ timeout: 150000 }).click().wait(45000)
    })
    it('creates a one-time dividend', () => {
      cy.getWithinIframe('button:contains("New reward")').trigger('click').wait(1000)
      cy.getWithinIframe('textarea[name="description"]').type('for all AUTD hodlers', { force: true })
      cy.getWithinIframe('button[name="referenceAsset"]').click()
      cy.getWithinIframe('button:contains("AUTD")').last().click()
      cy.getWithinIframe('button[name="rewardType"]').click()
      cy.getWithinIframe('button:contains("One-time Dividend")').last().click()
      cy.getWithinIframe('input[name="amount"]').then(([ input ]) => input.setAttribute('value', 1.25)).type(0, {force: true})
      cy.getWithinIframe('button:contains("Continue")').click()
      cy.getWithinIframe('button:contains("Submit")').click()

      cy.contains('button','Create transaction').click()
      cy.contains('button','Close').click().wait(1000)
    })

    it('can claim a reward', () => {
      cy.exec('npm run mine to 8000', { timeout: 200000 }).then(res => console.info(res.stderr, '\n',res.stdout))
      cy.getWithinIframe('span:contains("My Rewards")').click()
      cy.wait(5000).getWithinIframe('button.fcvbGI').last().trigger('click')
      cy.getWithinIframe('button:contains("Claim")').click()

      cy.contains('button','Create transaction').click()
      cy.contains('button','Close').click().wait(1000)
    })
  })
})
