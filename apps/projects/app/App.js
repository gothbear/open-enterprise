import React, { useState } from 'react'
import { ApolloProvider } from 'react-apollo'

import { useAragonApi } from './api-react'
import {
  Bar,
  Button,
  BackButton,
  Header,
  IconPlus,
  Main,
  Tabs,
} from '@aragon/ui'

import ErrorBoundary from './components/App/ErrorBoundary'
import { Issues, Overview, Settings } from './components/Content'
import IssueDetail from './components/Content/IssueDetail'
import { PanelManager, PanelContext, usePanelManagement } from './components/Panel'

import { IdentityProvider } from '../../../shared/identity'

import { initApolloClient } from './utils/apollo-client'
import { STATUS } from './utils/github'
import Unauthorized from './components/Content/Unauthorized'
import { Error } from './components/Card'
import { DecoratedReposProvider } from './context/DecoratedRepos'
import GithubSignin from './GithubSignin'

const App = () => {
  const { api, appState } = useAragonApi()
  const [ activeIndex, setActiveIndex ] = useState(
    { tabIndex: 0, tabData: {} }
  )
  const [ selectedIssueId, setSelectedIssue ] = useState(null)
  const [ githubLoading, setGithubLoading ] = useState(false)
  const [ panel, setPanel ] = useState(null)
  const [ panelProps, setPanelProps ] = useState(null)

  const {
    repos = [],
    bountySettings = {},
    issues = [],
    tokens = [],
    github = { status : STATUS.INITIAL },
    isSyncing = true,
  } = appState

  const client = github.token ? initApolloClient(github.token) : null

  const changeActiveIndex = data => {
    setActiveIndex(data)
  }

  const closePanel = () => {
    setPanel(null)
    setPanelProps(null)
  }

  const configurePanel = {
    setActivePanel: p => setPanel(p),
    setPanelProps: p => setPanelProps(p),
  }

  const handleGithubSignIn = () => {
    setGithubLoading(true)
  }

  const handleSelect = index => {
    changeActiveIndex({ tabIndex: index, tabData: {} })
  }

  const handleResolveLocalIdentity = address => {
    return api.resolveAddressIdentity(address).toPromise()
  }

  const handleShowLocalIdentityModal = address => {
    return api
      .requestAddressIdentityModification(address)
      .toPromise()
  }

  const noop = () => {}
  if (githubLoading) {
    return (
      <GithubSignin setGithubLoading={setGithubLoading} />
    )
  } else if (github.status === STATUS.INITIAL) {
    return (
      <Main>
        <Unauthorized onLogin={handleGithubSignIn} isSyncing={isSyncing} />
      </Main>
    )
  } else if (github.status === STATUS.FAILED) {
    return (
      <Main>
        <Error action={noop} />
      </Main>
    )
  }

  // Tabs are not fixed
  const tabs = [{ name: 'Overview', body: Overview }]
  if (repos.length)
    tabs.push({ name: 'Issues', body: Issues })
  tabs.push({ name: 'Settings', body: Settings })

  // Determine current tab details
  const TabComponent = tabs[activeIndex.tabIndex].body
  const TabAction = () => {
    const { setupNewIssue, setupNewProject } = usePanelManagement()

    switch (tabs[activeIndex.tabIndex].name) {
    case 'Overview': return (
      <Button mode="strong" icon={<IconPlus />} onClick={setupNewProject} label="New Project" />
    )
    case 'Issues': return (
      <Button mode="strong" icon={<IconPlus />} onClick={setupNewIssue} label="New Issue" />
    )
    default: return null
    }
  }

  return (
    <Main>
      <ApolloProvider client={client}>
        <PanelContext.Provider value={configurePanel}>
          <IdentityProvider
            onResolve={handleResolveLocalIdentity}
            onShowLocalIdentityModal={handleShowLocalIdentityModal}
          >
            <DecoratedReposProvider>
              <Header
                primary="Projects"
                secondary={
                  <TabAction />
                }
              />
              <ErrorBoundary>

                {selectedIssueId
                  ? (
                    <React.Fragment>
                      <Bar>
                        <BackButton onClick={() => setSelectedIssue(null)} />
                      </Bar>
                      <IssueDetail issueId={selectedIssueId} />
                    </React.Fragment>
                  )
                  : (
                    <React.Fragment>
                      <Tabs
                        items={tabs.map(t => t.name)}
                        onChange={handleSelect}
                        selected={activeIndex.tabIndex}
                      />
                      <TabComponent
                        status={github.status}
                        app={api}
                        bountyIssues={issues}
                        bountySettings={bountySettings}
                        tokens={tokens}
                        activeIndex={activeIndex}
                        changeActiveIndex={changeActiveIndex}
                        setSelectedIssue={setSelectedIssue}
                        onLogin={handleGithubSignIn}
                      />
                    </React.Fragment>
                  )
                }
              </ErrorBoundary>
              <PanelManager
                activePanel={panel}
                onClose={closePanel}
                {...panelProps}
              />
            </DecoratedReposProvider>
          </IdentityProvider>
        </PanelContext.Provider>
      </ApolloProvider>
    </Main>
  )
}

export default App
